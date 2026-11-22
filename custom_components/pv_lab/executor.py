"""Persisted, bounded switch.turn_on execution. Never turn a device off or retry a command."""
import asyncio
import copy
import logging
import math
import re
from datetime import datetime, timedelta, timezone
from homeassistant.helpers.event import async_track_point_in_utc_time, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import device_schedule
from .const import CONF_URL, CONF_TOKEN
_LOGGER = logging.getLogger(__name__)
TERMINAL = {"sent", "failed", "missed", "uncertain", "cancelled"}


def utc_ms():
    return datetime.now(timezone.utc).timestamp() * 1000


class PlanExecutor:
    def __init__(self, hass, entry, *, store=None, now=utc_ms, requester=None):
        self.hass, self.entry, self.now = hass, entry, now
        self.store = store or Store(hass, 1, "pv_lab_execution_" + entry.entry_id)
        self.requester = requester
        self.data = {"plan": None, "commands": {}, "receipts": [], "reviewAt": 0, "message": "", "watermark": 0, "blockedPlans": []}
        self.lock = asyncio.Lock()
        self.network_lock = asyncio.Lock()
        self.save_lock = asyncio.Lock()
        self.cancel_timer = self.cancel_interval = None
        self.stopped = False

    async def async_setup(self):
        saved = await self.store.async_load()
        if saved is not None:
            if not isinstance(saved, dict) or not isinstance(saved.get("commands"), dict) or not isinstance(saved.get("receipts"), list):
                raise ValueError("Nieprawidłowy zapis wykonania PV Lab; nie uruchomiono switchy")
            self.data.update(saved)
        for command in self.data["commands"].values():
            if command["status"] == "dispatching":
                command["status"] = "uncertain"
                self._receipt(command)
        await self._save()
        self.cancel_interval = async_track_time_interval(self.hass, self.async_tick, timedelta(minutes=1))
        self._schedule()

    async def _save(self):
        async with self.save_lock:
            await self.store.async_save(copy.deepcopy(self.data))

    def status(self):
        return {"message": self.data["message"], "commands": [{k: c.get(k) for k in ("key", "status", "start", "at")} for c in self.data["commands"].values()][-16:]}

    def present(self, state):
        result = copy.deepcopy(state)
        execution = result.get("execution") or {}
        if execution.get("planId") in self.data["blockedPlans"]:
            result.update(approved=False, cancelledAt=self.now(), cancelReason="Anulowano lokalnie w Home Assistant.", phase="anulowany")
            execution.update(enabled=False, auto=False, reviewMessage="Anulowano przyszłe polecenia.")
        result["executorStatus"] = self.status()
        return result

    async def _request(self, request):
        if self.requester:
            return await self.requester(request)
        return await device_schedule(async_get_clientsession(self.hass), self.entry.data[CONF_URL], self.entry.data[CONF_TOKEN], request)

    def _receipt(self, command):
        event = {"action": "event", "plan_id": command["planId"], "cycle_key": command["key"], "status": command["status"], "at": command.get("at", self.now())}
        self.data["receipts"].append(event)

    async def async_accept(self, state):
        execution = state.get("execution") if isinstance(state, dict) else None
        if not isinstance(execution, dict) or execution.get("schema") != 1:
            return
        async with self.lock:
            if execution.get("planId") in self.data["blockedPlans"] or execution.get("createdAt", 0) < self.data["watermark"]:
                return
            previous_data = copy.deepcopy(self.data)
            current = self.data["plan"]
            if current and (execution.get("createdAt", 0) < current.get("createdAt", 0) or execution.get("planId") == current.get("planId") and execution.get("revision", 0) < current.get("revision", 0)):
                return
            if not execution.get("enabled") or state.get("cancelledAt"):
                if current and current.get("planId") == execution.get("planId"):
                    self.data["plan"] = None
                    for command in self.data["commands"].values():
                        if command["status"] == "pending":
                            command["status"] = "cancelled"
                    await self._save()
                    self._schedule()
                return
            cycles = execution.get("cycles")
            if execution.get("mode") not in ("fixed", "flexible", "finish") or not isinstance(cycles, list) or not 1 <= len(cycles) <= 8 or not isinstance(execution.get("planId"), str):
                raise ValueError("Nieprawidłowy plan wykonania")
            horizon = execution.get("horizon", {})
            for cycle in cycles:
                if not isinstance(cycle.get("key"), str) or not re.fullmatch(r"switch\.[a-z0-9_]+", cycle.get("switchEntity", "")) or any(not isinstance(cycle.get(k), (int, float)) or not math.isfinite(cycle[k]) for k in ("start", "end")) or cycle["end"] <= cycle["start"] or cycle["start"] < horizon.get("earliest", math.inf) or cycle["end"] > horizon.get("latest", -math.inf):
                    raise ValueError("Nieprawidłowy switch lub czas cyklu")
            if len({c["key"] for c in cycles}) != len(cycles):
                raise ValueError("Powielony cykl")
            for cycle in cycles:
                existing = self.data["commands"].get(execution["planId"] + "|" + cycle["key"])
                if existing and existing["status"] == "pending" and existing["start"] <= self.now() + 900000 and cycle["start"] != existing["start"]:
                    raise ValueError("Nie wolno przesuwać startu w ostatnich 15 minutach")
            active_keys = set()
            for cycle in cycles:
                identity = execution["planId"] + "|" + cycle["key"]
                active_keys.add(identity)
                existing = self.data["commands"].get(identity)
                if existing and existing["status"] != "pending":
                    continue
                if existing and existing["start"] <= self.now() + 900000 and cycle["start"] != existing["start"]:
                    raise ValueError("Nie wolno przesuwać startu w ostatnich 15 minutach")
                status = cycle.get("status", "pending")
                self.data["commands"][identity] = {"planId": execution["planId"], "key": cycle["key"], "entity": cycle["switchEntity"], "start": cycle["start"], "end": cycle["end"], "status": status if status in TERMINAL or status == "dispatching" else "pending", "at": cycle.get("commandAt")}
            for identity, command in self.data["commands"].items():
                if identity not in active_keys and command["status"] == "pending":
                    command["status"] = "cancelled"
            # Keep recent execution identities across app responses and HA restarts.
            self.data["commands"] = dict(list(self.data["commands"].items())[-200:])
            self.data["plan"] = copy.deepcopy(execution)
            self.data["watermark"] = max(self.data["watermark"], execution.get("createdAt", 0))
            self.data["receipts"] = [e for e in self.data["receipts"] if e["plan_id"] == execution["planId"]]
            try:
                await self._save()
            except Exception:
                self.data = previous_data
                raise
            self._schedule()

    def _schedule(self):
        if self.cancel_timer:
            self.cancel_timer()
            self.cancel_timer = None
        if self.stopped or not self.data["plan"]:
            return
        pending = [c["start"] for c in self.data["commands"].values() if c["status"] == "pending"]
        if pending:
            at = max(self.now() + (100 if getattr(self.hass, "is_running", True) else 10000), min(pending))
            self.cancel_timer = async_track_point_in_utc_time(self.hass, self.async_due, datetime.fromtimestamp(at / 1000, timezone.utc))

    async def async_cancel(self):
        async with self.lock:
            if self.data["plan"]:
                self.data["blockedPlans"] = (self.data["blockedPlans"] + [self.data["plan"]["planId"]])[-200:]
                self.data["receipts"].append({"action": "cancel", "plan_id": self.data["plan"]["planId"]})
            self.data["plan"] = None
            for c in self.data["commands"].values():
                if c["status"] == "pending":
                    c["status"] = "cancelled"
            self.data["message"] = "Anulowano przyszłe polecenia."
            await self._save()
            self._schedule()

    async def async_due(self, _now=None):
        async with self.lock:
            if self.stopped or not self.data["plan"]:
                return
            if not getattr(self.hass, "is_running", True):
                self._schedule()
                return
            for command in self.data["commands"].values():
                if command["status"] != "pending" or command["start"] > self.now():
                    continue
                state = self.hass.states.get(command["entity"])
                if self.now() - command["start"] > 120000:
                    command["status"] = "missed"
                elif state is None or state.state not in ("on", "off"):
                    command["status"] = "failed"
                else:
                    command["status"] = "dispatching"
                    command["at"] = self.now()
                    self._receipt(command)
                    # A failure to persist this intent aborts before touching a switch.
                    await self._save()
                    try:
                        async with asyncio.timeout(20):
                            await self.hass.services.async_call("switch", "turn_on", {"entity_id": command["entity"]}, blocking=True)
                        command["status"] = "sent"
                    except Exception:
                        command["status"] = "uncertain"
                        _LOGGER.warning("PV Lab: wynik wysłania polecenia niepewny; nie ponawiamy cyklu %s", command["key"])
                command["at"] = self.now()
                self._receipt(command)
                await self._save()
            self._schedule()
        await self.async_flush()

    async def async_flush(self):
        if self.network_lock.locked():
            return
        async with self.network_lock:
            try:
                while self.data["receipts"]:
                    event = self.data["receipts"][0]
                    result = await self._request(event)
                    if event in self.data["receipts"]:
                        self.data["receipts"].remove(event)
                    await self._save()
                    await self.async_accept(result)
                plan = self.data["plan"]
                if plan and plan.get("mode") != "fixed" and self.now() - max(plan.get("lastReviewAt", 0), self.data["reviewAt"]) >= 1800000 and any(c["status"] == "pending" for c in self.data["commands"].values()):
                    result = await self._request({"action": "review", "plan_id": plan["planId"]})
                    self.data["reviewAt"] = self.now()
                    await self._save()
                    await self.async_accept(result)
            except Exception:
                self.data["message"] = "Brak potwierdzenia z aplikacji. Zachowano plan i lokalną historię wykonania."

    async def async_tick(self, _now=None):
        await self.async_due(_now)

    async def async_stop(self):
        self.stopped = True
        if self.cancel_timer:
            self.cancel_timer()
        if self.cancel_interval:
            self.cancel_interval()
        await self._save()
