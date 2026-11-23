"""Exercise native-card bridge, resource setup and timestamp contracts without a HA installation."""
import asyncio
import ast
import importlib
import pathlib
import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock, patch

ROOT = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "pv_lab"


class DashboardComponentTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        package = types.ModuleType("dashboard_component_test")
        package.__path__ = [str(ROOT)]
        modules = {"dashboard_component_test": package}
        names = ("homeassistant", "homeassistant.components", "homeassistant.helpers", "homeassistant.components.websocket_api", "homeassistant.components.frontend", "homeassistant.components.http", "homeassistant.exceptions", "homeassistant.helpers.aiohttp_client", "probatio", "aiohttp")
        for name in names:
            modules[name] = types.ModuleType(name)
        schema = modules["probatio"]
        schema.Required = schema.Optional = lambda value: value
        schema.In = lambda value: value
        schema.Range = lambda **kwargs: kwargs
        schema.All = schema.Any = lambda *args: args
        ws = modules["homeassistant.components.websocket_api"]
        ws.websocket_command = lambda schema: lambda fn: fn
        ws.async_response = lambda fn: fn
        ws.async_register_command = Mock()
        self.js = modules["homeassistant.components.frontend"].add_extra_js_url = Mock()
        modules["homeassistant.components.http"].StaticPathConfig = lambda *args: args
        modules["homeassistant.exceptions"].ConfigEntryNotReady = type("ConfigEntryNotReady", (Exception,), {})
        modules["homeassistant.exceptions"].HomeAssistantError = type("HomeAssistantError", (Exception,), {})
        modules["homeassistant.helpers.aiohttp_client"].async_get_clientsession = lambda hass: "private_session"
        modules["aiohttp"].ClientSession = object
        modules["aiohttp"].ClientError = type("ClientError", (Exception,), {})
        executor_module = types.ModuleType("dashboard_component_test.executor")
        executor_module.PlanExecutor = Mock(return_value=types.SimpleNamespace(async_setup=AsyncMock(), async_stop=AsyncMock(), data={}))
        modules["dashboard_component_test.executor"] = executor_module
        self.modules = patch.dict(sys.modules, modules)
        self.modules.start()
        self.module = importlib.import_module("dashboard_component_test.dashboard")
        self.contract = importlib.import_module("dashboard_component_test.contract")
        self.coordinator = types.SimpleNamespace(entry=types.SimpleNamespace(title="PV Lab", data={"url": "http://private-app", "token": "PRIVATE_PAIRING_TOKEN"}), async_request_refresh=AsyncMock(), async_update_listeners=Mock(), data={})
        self.hass = types.SimpleNamespace(data={"pv_lab": {"entry": self.coordinator}}, http=types.SimpleNamespace(async_register_static_paths=AsyncMock()))
        self.connection = types.SimpleNamespace(send_result=Mock(), send_error=Mock())

    async def asyncTearDown(self):
        self.modules.stop()
        for key in list(sys.modules):
            if key.startswith("dashboard_component_test"):
                del sys.modules[key]

    async def test_static_resource_and_commands_register_once_even_with_multiple_entries(self):
        await asyncio.gather(self.module.async_setup_dashboard(self.hass), self.module.async_setup_dashboard(self.hass))
        self.hass.http.async_register_static_paths.assert_awaited_once()
        self.js.assert_called_once()
        self.assertIn("pv-lab-plan-card.js?v=0.9.5", self.js.call_args.args[1])
        self.assertTrue((ROOT / "www/pv-lab-plan-card.js").is_file())

    async def test_card_is_registered_before_offline_app_aborts_entry_setup(self):
        setup = next(node for node in ast.parse((ROOT / '__init__.py').read_text(encoding='utf-8')).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'async_setup_entry')
        coordinator = types.SimpleNamespace(async_config_entry_first_refresh=AsyncMock(side_effect=RuntimeError('app offline')))
        namespace = {'__package__': 'dashboard_component_test', 'PVLabCoordinator': Mock(return_value=coordinator)}
        exec(compile(ast.Module(body=[setup], type_ignores=[]), str(ROOT / '__init__.py'), 'exec'), namespace)
        with self.assertRaisesRegex(RuntimeError, 'app offline'):
            await namespace['async_setup_entry'](self.hass, self.coordinator.entry)
        self.hass.http.async_register_static_paths.assert_awaited_once()
        self.js.assert_called_once()

    async def test_preview_bridge_uses_server_credentials_and_publishes_no_switch_calls(self):
        request={"id": 1, "type": "pv_lab/device_schedule", "entry_id": "entry", "action": "preview", "counts": {"pralka": 2, "zmywarka": 1}, "range": "today", "goal": "pv"}
        bridge=AsyncMock(return_value={"proposals": [], "approved": False})
        with patch.object(self.module, "device_schedule", bridge):
            await self.module.ws_schedule(self.hass, self.connection, request)
        self.assertEqual(bridge.await_args.args[1:3], ("http://private-app", "PRIVATE_PAIRING_TOKEN"))
        self.assertNotIn("entry_id", bridge.await_args.args[3])
        self.assertNotIn("PRIVATE_PAIRING_TOKEN", str(self.connection.send_result.call_args))
        self.coordinator.async_request_refresh.assert_not_awaited()
        self.coordinator.async_update_listeners.assert_called_once()

    async def test_unknown_entry_returns_error_without_network_access(self):
        bridge=AsyncMock()
        with patch.object(self.module, "device_schedule", bridge):
            await self.module.ws_schedule(self.hass, self.connection, {"id": 1, "entry_id": "missing", "action": "status"})
        bridge.assert_not_awaited()
        self.connection.send_error.assert_called_once()

    async def test_approved_fixed_cycle_timestamps_survive_first_start_and_cancel_to_unknown(self):
        now=datetime.now(timezone.utc).timestamp()*1000
        cycles=[{"id":"pralka_1", "deviceId":"pralka", "name":"Pralka 1", "start":now-60000,"end":now+300000},{"id":"pralka_2", "deviceId":"pralka", "name":"Pralka 2", "start":now+3600000,"end":now+7200000}]
        plan={"readAt":now,"approved":True,"approvedAt":now-120000,"phase":"zatwierdzony","id":"stable-plan","selected":{"end":now+7200000,"cycles":cycles}}
        payload={"available":False,"devicePlanning":plan}
        self.assertTrue(self.contract.read_dashboard_plan(payload,"dashboard_approved",now=now)[0])
        self.assertEqual(self.contract.read_dashboard_plan(payload,"dashboard_start",0,now)[0],cycles[0]["start"])
        self.assertEqual(self.contract.read_dashboard_plan(payload,"dashboard_start",1,now)[0],cycles[1]["start"])
        plan.update(approved=False,selected=None,phase="anulowany")
        self.assertIsNone(self.contract.read_dashboard_plan(payload,"dashboard_start",0,now)[0])
        self.assertFalse(self.contract.read_dashboard_plan(payload,"dashboard_approved",now=now)[0])
        self.assertIsNone(self.contract.read_dashboard_plan(payload,"dashboard_approved",now=now+300000)[0])

    async def test_offline_app_keeps_restored_executor_loaded(self):
        setup = next(node for node in ast.parse((ROOT / '__init__.py').read_text(encoding='utf-8')).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'async_setup_entry')
        error = sys.modules["homeassistant.exceptions"].ConfigEntryNotReady
        coordinator = types.SimpleNamespace(async_config_entry_first_refresh=AsyncMock(side_effect=error()), async_set_updated_data=Mock())
        platform = types.SimpleNamespace(**{key:key for key in ("SENSOR","BINARY_SENSOR","NUMBER","SELECT","DATETIME")})
        self.coordinator.entry.entry_id="entry"
        self.hass.config_entries=types.SimpleNamespace(async_forward_entry_setups=AsyncMock())
        executor = sys.modules["dashboard_component_test.executor"].PlanExecutor.return_value
        executor.data={"plan":{"planId":"saved"}}
        namespace={'__package__':'dashboard_component_test','PVLabCoordinator':Mock(return_value=coordinator),'DOMAIN':'pv_lab','Platform':platform}
        exec(compile(ast.Module(body=[setup],type_ignores=[]), str(ROOT/'__init__.py'),'exec'),namespace)
        self.assertTrue(await namespace['async_setup_entry'](self.hass,self.coordinator.entry))
        executor.async_stop.assert_not_awaited()
        self.assertFalse(coordinator.last_update_success)
        self.hass.config_entries.async_forward_entry_setups.assert_awaited_once()

    async def test_offline_app_keeps_restored_auto_countdown_loaded(self):
        setup = next(node for node in ast.parse((ROOT / '__init__.py').read_text(encoding='utf-8')).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'async_setup_entry')
        error = sys.modules["homeassistant.exceptions"].ConfigEntryNotReady
        coordinator = types.SimpleNamespace(async_config_entry_first_refresh=AsyncMock(side_effect=error()), async_set_updated_data=Mock())
        platform = types.SimpleNamespace(**{key:key for key in ("SENSOR","BINARY_SENSOR","NUMBER","SELECT","DATETIME")})
        self.coordinator.entry.entry_id="entry"
        self.hass.config_entries=types.SimpleNamespace(async_forward_entry_setups=AsyncMock())
        executor = sys.modules["dashboard_component_test.executor"].PlanExecutor.return_value
        executor.data={"plan":None,"autoSetup":{"id":"waiting","active":True}}
        namespace={'__package__':'dashboard_component_test','PVLabCoordinator':Mock(return_value=coordinator),'DOMAIN':'pv_lab','Platform':platform}
        exec(compile(ast.Module(body=[setup],type_ignores=[]), str(ROOT/'__init__.py'),'exec'),namespace)
        self.assertTrue(await namespace['async_setup_entry'](self.hass,self.coordinator.entry))
        executor.async_stop.assert_not_awaited()
        self.assertFalse(coordinator.last_update_success)
        self.hass.config_entries.async_forward_entry_setups.assert_awaited_once()

    async def test_platform_setup_failure_stops_timers_before_setup_retry(self):
        setup = next(node for node in ast.parse((ROOT / '__init__.py').read_text(encoding='utf-8')).body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'async_setup_entry')
        coordinator=types.SimpleNamespace(async_config_entry_first_refresh=AsyncMock())
        platform=types.SimpleNamespace(**{key:key for key in ("SENSOR","BINARY_SENSOR","NUMBER","SELECT","DATETIME")})
        self.coordinator.entry.entry_id="entry"
        self.hass.config_entries=types.SimpleNamespace(async_forward_entry_setups=AsyncMock(side_effect=RuntimeError("platform failed")))
        executor=sys.modules["dashboard_component_test.executor"].PlanExecutor.return_value
        namespace={'__package__':'dashboard_component_test','PVLabCoordinator':Mock(return_value=coordinator),'DOMAIN':'pv_lab','Platform':platform}
        exec(compile(ast.Module(body=[setup],type_ignores=[]),str(ROOT/'__init__.py'),'exec'),namespace)
        with self.assertRaisesRegex(RuntimeError,'platform failed'):
            await namespace['async_setup_entry'](self.hass,self.coordinator.entry)
        executor.async_stop.assert_awaited_once()
        self.assertNotIn('entry',self.hass.data['pv_lab'])
