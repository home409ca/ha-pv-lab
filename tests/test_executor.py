"""Use fake HA services and persistent memory storage; never control real switches."""
import copy
import importlib
import pathlib
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch
ROOT = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "pv_lab"

class MemoryStore:
    def __init__(self): self.data = None; self.fail = False
    async def async_load(self): return copy.deepcopy(self.data)
    async def async_save(self, data):
        if self.fail: raise OSError("disk unavailable")
        self.data = copy.deepcopy(data)

class ExecutorTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        package = types.ModuleType("execution_component_test"); package.__path__ = [str(ROOT)]
        modules = {"execution_component_test": package}
        for name in ("homeassistant", "homeassistant.helpers", "homeassistant.helpers.event", "homeassistant.helpers.storage", "homeassistant.helpers.aiohttp_client", "execution_component_test.api"):
            modules[name] = types.ModuleType(name)
        modules["homeassistant.helpers.event"].async_track_point_in_utc_time = lambda *args: lambda: None
        modules["homeassistant.helpers.event"].async_track_time_interval = lambda *args: lambda: None
        modules["homeassistant.helpers.storage"].Store = object
        modules["homeassistant.helpers.aiohttp_client"].async_get_clientsession = lambda hass: None
        modules["execution_component_test.api"].device_schedule = AsyncMock()
        self.modules = patch.dict(sys.modules, modules); self.modules.start()
        self.module = importlib.import_module("execution_component_test.executor")
        self.at = 1800000000000
        self.store = MemoryStore()
        self.service = AsyncMock()
        self.hass = types.SimpleNamespace(is_running=True, services=types.SimpleNamespace(async_call=self.service), states=types.SimpleNamespace(get=lambda entity: types.SimpleNamespace(state="on")))
        self.request = AsyncMock(return_value={})
        self.executor = self.new()
        await self.executor.async_setup()
    def new(self): return self.module.PlanExecutor(self.hass, types.SimpleNamespace(entry_id="test", data={}), store=self.store, now=lambda: self.at, requester=self.request)
    def plan(self, count=1, mode="fixed"):
        return {"approved": True, "execution": {"schema": 1, "planId": "p", "createdAt": self.at, "revision": 1, "enabled": True, "mode": mode, "auto": False, "lastReviewAt": self.at, "horizon": {"earliest": self.at, "latest": self.at+86400000}, "cycles": [{"key": "zmywarka_"+str(i), "switchEntity": "switch.gniazdkopomiarzmywarka", "start": self.at+60000+i*3600000, "end": self.at+3600000+i*3600000, "status": "pending"} for i in range(count)]}}
    async def asyncTearDown(self):
        await self.executor.async_stop(); self.modules.stop()
        for key in list(sys.modules):
            if key.startswith("execution_component_test"): del sys.modules[key]
    async def test_each_cycle_calls_turn_on_even_if_switch_is_already_on(self):
        await self.executor.async_accept(self.plan(2)); self.at+=60000; await self.executor.async_due(); await self.executor.async_due()
        self.assertEqual(self.service.await_count,1)
        self.service.assert_awaited_with("switch","turn_on",{"entity_id":"switch.gniazdkopomiarzmywarka"},blocking=True)
        self.at+=3600000; await self.executor.async_due(); self.assertEqual(self.service.await_count,2)
    async def test_restart_and_repeated_server_snapshots_do_not_repeat_sent_cycle(self):
        plan=self.plan(); await self.executor.async_accept(plan); self.at+=60000; await self.executor.async_due(); await self.executor.async_stop()
        self.executor=self.new(); await self.executor.async_setup(); await self.executor.async_accept(plan); await self.executor.async_due(); self.assertEqual(self.service.await_count,1)
    async def test_cancel_remains_disarmed_if_old_app_snapshot_returns(self):
        plan=self.plan(); await self.executor.async_accept(plan); await self.executor.async_cancel(); await self.executor.async_accept(plan); self.at+=60000; await self.executor.async_due(); self.service.assert_not_awaited()
    async def test_app_offline_does_not_stop_approved_fixed_switch_command(self):
        self.request.side_effect=OSError("app offline"); await self.executor.async_accept(self.plan()); self.at+=60000; await self.executor.async_due(); self.assertEqual(self.service.await_count,1); self.assertTrue(self.store.data["receipts"])
    async def test_no_call_if_intent_cannot_be_persisted(self):
        await self.executor.async_accept(self.plan()); self.at+=60000; self.store.fail=True
        with self.assertRaises(OSError): await self.executor.async_due()
        self.service.assert_not_awaited(); self.store.fail=False
    async def test_uncertain_service_result_is_not_automatically_retried(self):
        self.service.side_effect=TimeoutError(); await self.executor.async_accept(self.plan()); self.at+=60000; await self.executor.async_due(); await self.executor.async_due(); self.assertEqual(self.service.await_count,1); self.assertEqual(next(iter(self.store.data["commands"].values()))["status"],"uncertain")
    async def test_late_or_unavailable_switch_is_not_executed(self):
        await self.executor.async_accept(self.plan()); self.at+=181000; await self.executor.async_due(); self.service.assert_not_awaited(); self.assertEqual(next(iter(self.store.data["commands"].values()))["status"],"missed")
    async def test_revision_cannot_move_a_cycle_inside_15_minute_freeze(self):
        plan=self.plan(); await self.executor.async_accept(plan); plan["execution"]["revision"]=2; plan["execution"]["cycles"][0]["start"]+=1800000; plan["execution"]["cycles"][0]["end"]+=1800000
        with self.assertRaises(ValueError): await self.executor.async_accept(plan)
    async def test_flexible_review_runs_every_half_hour_without_a_card(self):
        plan=self.plan(mode="flexible"); plan["execution"]["cycles"][0]["start"]+=7200000; plan["execution"]["cycles"][0]["end"]+=7200000; await self.executor.async_accept(plan)
        await self.executor.async_tick(); self.request.assert_not_awaited(); self.at+=1800000; await self.executor.async_tick(); self.assertEqual(self.request.await_args.args[0]["action"],"review"); await self.executor.async_tick(); self.assertEqual(self.request.await_count,1)
    async def test_restart_after_dispatch_intent_does_not_guess_or_repeat(self):
        await self.executor.async_accept(self.plan()); command=next(iter(self.executor.data["commands"].values())); command["status"]="dispatching"; await self.executor._save(); await self.executor.async_stop(); self.executor=self.new(); await self.executor.async_setup(); self.at+=60000; await self.executor.async_due(); self.service.assert_not_awaited(); self.assertEqual(next(iter(self.executor.data["commands"].values()))["status"],"uncertain")

    async def test_unavailable_switch_is_failed_without_call(self):
        self.hass.states.get=lambda entity: types.SimpleNamespace(state="unavailable")
        await self.executor.async_accept(self.plan()); self.at+=60000; await self.executor.async_due(); self.service.assert_not_awaited(); self.assertEqual(next(iter(self.store.data["commands"].values()))["status"],"failed")
    async def test_cancelled_plan_is_presented_as_cancelled_even_if_app_is_offline(self):
        plan=self.plan(); await self.executor.async_accept(plan); await self.executor.async_cancel(); self.assertFalse(self.executor.present(plan)["approved"]); self.assertTrue(self.store.data["receipts"])

    async def test_ha_startup_waits_until_services_are_ready(self):
        self.hass.is_running=False
        await self.executor.async_accept(self.plan()); self.at+=60000; await self.executor.async_due(); self.service.assert_not_awaited()
        self.hass.is_running=True
        await self.executor.async_due(); self.service.assert_awaited_once()

    def waiting(self):
        return {"autoSetup": {"id": "a", "active": True, "requestedAt": self.at, "readyAt": self.at+600000, "range": "today"}}

    async def test_auto_waits_ten_minutes_and_survives_restart(self):
        waiting = self.waiting()
        await self.executor.async_accept(waiting)
        self.at += 599999
        await self.executor.async_due()
        self.request.assert_not_awaited()
        await self.executor.async_stop()
        self.executor = self.new()
        await self.executor.async_setup()
        self.at += 1
        self.request.return_value = {"autoSetup": {**waiting["autoSetup"], "active": False}, **self.plan()}
        await self.executor.async_due()
        self.assertEqual(self.request.await_args.args[0], {"action": "auto_start", "auto_id": "a"})
        self.assertIsNotNone(self.executor.data["plan"])
        self.service.assert_not_awaited()

    async def test_auto_cancel_blocks_late_planning_response_and_offline_restart(self):
        waiting = self.waiting()
        await self.executor.async_accept(waiting)
        await self.executor.async_cancel()
        await self.executor.async_accept({"autoSetup": {**waiting["autoSetup"], "active": False}, **self.plan()})
        self.assertIsNone(self.executor.data["plan"])
        self.assertFalse(self.executor.present(waiting)["autoSetup"]["active"])
        self.at += 600000
        await self.executor.async_due()
        self.service.assert_not_awaited()

    async def test_offline_auto_retries_once_per_minute_not_a_loop(self):
        await self.executor.async_accept(self.waiting())
        self.request.side_effect = OSError("offline")
        self.at += 600000
        await self.executor.async_due()
        await self.executor.async_due()
        self.assertEqual(self.request.await_count, 1)
        self.at += 60000
        await self.executor.async_due()
        self.assertEqual(self.request.await_count, 2)

    async def test_auto_never_arms_if_countdown_cannot_be_saved(self):
        self.store.fail = True
        with self.assertRaises(OSError):
            await self.executor.async_accept(self.waiting())
        self.assertIsNone(self.executor.data["autoSetup"])
        self.store.fail = False
