"""Running entities share the app's detector, remain available at night, and fail unknown."""
import importlib
import pathlib
import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "pv_lab"


class Entity:
    pass


class CoordinatorEntity(Entity):
    def __init__(self, coordinator):
        self.coordinator = coordinator

    @property
    def available(self):
        return self.coordinator.last_update_success


class ApplianceBinaryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        package = types.ModuleType("appliance_component_test")
        package.__path__ = [str(ROOT)]
        modules = {"appliance_component_test": package}
        for name in ("homeassistant", "homeassistant.components", "homeassistant.helpers", "homeassistant.components.binary_sensor", "homeassistant.helpers.update_coordinator", "homeassistant.helpers.restore_state"):
            modules[name] = types.ModuleType(name)
        modules["homeassistant.components.binary_sensor"].BinarySensorEntity = type("BinarySensorEntity", (Entity,), {})
        modules["homeassistant.components.binary_sensor"].BinarySensorDeviceClass = types.SimpleNamespace(RUNNING="running")
        modules["homeassistant.helpers.update_coordinator"].CoordinatorEntity = CoordinatorEntity
        modules["homeassistant.helpers.restore_state"].RestoreEntity = type("RestoreEntity", (Entity,), {})
        self.modules = patch.dict(sys.modules, modules)
        self.modules.start()
        self.binary = importlib.import_module("appliance_component_test.binary_sensor")
        self.contract = importlib.import_module("appliance_component_test.contract")
        self.now = datetime.now(timezone.utc).timestamp() * 1000
        self.row = {"id": "pralka", "status": "running", "running": True, "readAt": self.now, "validUntil": self.now + 180000, "powerEntity": "sensor.washer", "powerW": 700, "startedAt": self.now - 1200000, "predictedEnd": self.now + 1800000, "blockedUntil": self.now + 1800000, "uncertain": True}
        self.coordinator = types.SimpleNamespace(data={"available": False, "applianceActivity": {"devices": [self.row]}}, last_update_success=True)
        self.entry = types.SimpleNamespace(entry_id="stable-entry")
        self.entity = self.binary.PVLabApplianceRunning(self.coordinator, self.entry, *next(spec for spec in self.binary.SPECS if spec[0] == "pralka"))

    async def asyncTearDown(self):
        self.modules.stop()
        for key in list(sys.modules):
            if key.startswith("appliance_component_test"):
                del sys.modules[key]

    async def test_two_entities_icons_stable_ids_and_setup(self):
        entities = []
        await self.binary.async_setup_entry(types.SimpleNamespace(data={"pv_lab": {self.entry.entry_id: self.coordinator}}), self.entry, lambda values: entities.extend(values))
        self.assertEqual(len(entities), 3)
        self.assertEqual([e._attr_icon for e in entities[:2]], ["mdi:dishwasher", "mdi:washing-machine"])
        self.assertEqual(self.entity._attr_device_class, "running")
        self.assertEqual(self.entity.suggested_object_id, "pv_lab_pralka_pracuje")
        self.assertIn("stable-entry", self.entity._attr_unique_id)

    async def test_night_and_missing_forecast_do_not_disable_running_entities(self):
        self.assertTrue(self.entity.available)
        self.assertTrue(self.entity.is_on)
        self.assertEqual(self.entity.extra_state_attributes["power_w"], 700)
        self.assertIsNotNone(self.entity.extra_state_attributes["estimated_end_at"])

    async def test_pause_stays_on_and_only_confirmed_idle_turns_off(self):
        self.row.update(status="pause", powerW=0)
        self.assertTrue(self.entity.is_on)
        self.row.update(status="idle", running=False)
        self.assertTrue(self.entity.available)
        self.assertFalse(self.entity.is_on)

    async def test_unknown_stale_wrong_boolean_and_unavailable_app_never_appear_off(self):
        for updates in ({"status": "unknown", "running": None}, {"validUntil": self.now-1}, {"running": "on"}, {"status": "idle", "running": True}):
            row = {**self.row, **updates}
            self.assertIsNone(self.contract.read_appliance_running({"applianceActivity": {"devices": [row]}}, "pralka", self.now)[0])
        self.coordinator.last_update_success = False
        self.assertTrue(self.entity.available)
        self.coordinator.data = {}
        self.assertIsNone(self.entity.is_on)

    async def test_last_confirmed_state_remains_visible_but_is_marked_stale(self):
        self.assertTrue(self.entity.is_on)
        self.coordinator.last_update_success = False
        self.coordinator.data = {}
        self.assertTrue(self.entity.available)
        self.assertTrue(self.entity.is_on)
        self.assertFalse(self.entity.extra_state_attributes["data_fresh"])
        self.coordinator.last_update_success = True
        self.row.update(status="idle", running=False)
        self.coordinator.data = {"applianceActivity": {"devices": [self.row]}}
        self.assertFalse(self.entity.is_on)
        self.assertTrue(self.entity.extra_state_attributes["data_fresh"])

    async def test_restore_preserves_confirmed_state_after_restart(self):
        from unittest.mock import AsyncMock
        self.binary.RestoreEntity.async_added_to_hass = AsyncMock()
        self.entity.async_get_last_state = AsyncMock(return_value=types.SimpleNamespace(state="on", attributes={"last_confirmed_at": self.now-60000}))
        self.coordinator.data = {}
        await self.entity.async_added_to_hass()
        self.assertTrue(self.entity.is_on)
        self.assertFalse(self.entity.extra_state_attributes["data_fresh"])
