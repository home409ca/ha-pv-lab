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
        self.data = {"plan": None, "commands": {}, "receipts": [], "reviewAt": 0, "message": "", "watermark": 0, "blockedPlans": [], "autoSetup": None, "blockedAuto": [], "autoRetryAt": 0,"watch": None,"monitoring": False}
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
        setup = result.get("autoSetup") or {}
        if setup.get("id") in self.data["blockedAuto"]:
            setup.update(active=False, message="Anulowano Auto w Home Assistant.")
            execution.update(enabled=False, auto=False)
            result.update(approved=False, phase="anulowany")
        if execution.get("planId") in self.data["blockedPlans"]:
            result.update(approved=False, cancelledAt=self.now(), cancelReason="Anulowano lokalnie w Home Assistant.", phase="anulowany")
            execution.update(enabled=False, auto=False, reviewMessage="Anulowano przyszłe polecenia.")
        watch = result.get("autoWatch") or {}
        if watch.get("id") in self.data["blockedAuto"]:
            watch["active"] = False
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
        watch = copy.deepcopy(state.get("autoWatch")) if isinstance(state, dict) else None
        if watch and watch.get("id") in self.data["blockedAuto"]:
            watch["active"] = False
            state = copy.deepcopy(state)
            if state.get("autoSetup"):
                state["autoSetup"]["active"] = False
            if (state.get("execution") or {}).get("auto"):
                state["execution"]["enabled"] = False
        self.data["watch"] = watch
        view_execution = state.get("execution") or {}
        self.data["monitoring"] = bool(view_execution.get("monitoring"))
        setup = state.get("autoSetup") if isinstance(state, dict) else None
        if isinstance(setup, dict):
            async with self.lock:
                if setup.get("id") in self.data["blockedAuto"]:
                    return
                current_setup = self.data["autoSetup"]
                if current_setup and setup.get("requestedAt", 0) < current_setup.get("requestedAt", 0):
                    return
                if setup.get("active"):
                    if not isinstance(setup.get("id"), str) or any(type(setup.get(k)) not in (int, float) or not math.isfinite(setup[k]) for k in ("requestedAt", "readyAt")) or setup["readyAt"] < setup["requestedAt"] + 600000:
                        raise ValueError("Nieprawidłowe odliczanie Auto")
                    previous = copy.deepcopy(self.data)
                    self.data["autoSetup"] = copy.deepcopy(setup)
                    try:
                        await self._save()
                    except Exception:
                        self.data = previous
                        raise
                elif current_setup and current_setup.get("id") == setup.get("id"):
                    self.data["autoSetup"] = None
                    self.data["message"] = setup.get("message", "")
                    await self._save()
                self._schedule()
        await self._save()
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
            self.data["monitoring"] = self.data["monitoring"] or any(c.get("status") in ("sent", "uncertain") for c in execution["cycles"])
            self.data["plan"] = copy.deepcopy(execution)
            self.data["watermark"] = max(self.data["watermark"], execution.get("createdAt", 0))
            self.data["receipts"] = [e for e in self.data["receipts"] if e.get("plan_id") == execution["planId"]]
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
        if self.stopped:
            return
        pending = [c["start"] for c in self.data["commands"].values() if c["status"] == "pending"]
        setup = self.data["autoSetup"]
        if setup and setup.get("active"):
            pending.append(max(setup["readyAt"], self.data["autoRetryAt"]))
        if pending:
            at = max(self.now() + (100 if getattr(self.hass, "is_running", True) else 10000), min(pending))
            self.cancel_timer = async_track_point_in_utc_time(self.hass, self.async_due, datetime.fromtimestamp(at / 1000, timezone.utc))

    async def async_cancel(self):
        async with self.lock:
            watch = self.data.get("watch")
            if watch:
                self.data["blockedAuto"] = (self.data["blockedAuto"] + [watch["id"]])[-200:]
                self.data["receipts"].append({"action": "cancel", "watch_id": watch["id"]})
            if self.data["autoSetup"]:
                identity = self.data["autoSetup"]["id"]
                self.data["blockedAuto"] = (self.data["blockedAuto"] + [identity])[-200:]
                self.data["receipts"].append({"action": "cancel", "auto_id": identity})
                self.data["autoSetup"] = None
            if self.data["plan"]:
                self.data["blockedPlans"] = (self.data["blockedPlans"] + [self.data["plan"]["planId"]])[-200:]
                self.data["receipts"].append({"action": "cancel", "plan_id": self.data["plan"]["planId"]})
            self.data["plan"] = None
            self.data["watch"] = None
            for c in self.data["commands"].values():
                if c["status"] == "pending":
                    c["status"] = "cancelled"
            self.data["message"] = "Anulowano przyszłe polecenia."
            await self._save()
            self._schedule()

    async def async_due(self, _now=None):
        await self.async_auto_due()
        if not self.data["plan"]:
            await self.async_flush()
            return
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

    async def async_auto_due(self):
        setup = self.data["autoSetup"]
        if self.stopped or not getattr(self.hass, "is_running", True) or not setup or not setup.get("active") or self.now() < max(setup["readyAt"], self.data["autoRetryAt"]) or self.network_lock.locked():
            return
        async with self.network_lock:
            # Persist retry pacing before contacting the app; a restart cannot create a tight loop.
            self.data["autoRetryAt"] = self.now() + 60000
            await self._save()
            try:
                result = await self._request({"action": "auto_start", "auto_id": setup["id"]})
                await self.async_accept(result)
            except Exception:
                self.data["message"] = "Auto czeka na połączenie z aplikacją; ponowimy odczyt za minutę."
                await self._save()
            self._schedule()

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
        if (self.data.get("watch") or {}).get("active") or self.data.get("monitoring"):
            if not self.network_lock.locked():
                async with self.network_lock:
                    try:
                        result = await self._request({"action": "monitor"})
                        await self.async_accept(result)
                    except Exception:
                        self.data["message"] = "Brak połączenia — Auto czeka; nie utworzono nowych poleceń."

    async def async_stop(self):
        self.stopped = True
        if self.cancel_timer:
            self.cancel_timer()
        if self.cancel_interval:
            self.cancel_interval()
        await self._save()
