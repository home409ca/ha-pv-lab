"""Exercise planner entities against minimal HA interfaces, without installing HA."""
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


class PlannerEntityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        package = types.ModuleType("planner_component_test")
        package.__path__ = [str(ROOT)]
        modules = {"planner_component_test": package}
        for name in ("homeassistant", "homeassistant.components", "homeassistant.helpers", "homeassistant.components.number", "homeassistant.components.select", "homeassistant.components.datetime", "homeassistant.components.sensor", "homeassistant.const", "homeassistant.helpers.update_coordinator"):
            modules[name] = types.ModuleType(name)
        modules["homeassistant.components.number"].NumberEntity = type("NumberEntity", (Entity,), {})
        modules["homeassistant.components.number"].NumberMode = types.SimpleNamespace(BOX="box")
        modules["homeassistant.components.select"].SelectEntity = type("SelectEntity", (Entity,), {})
        modules["homeassistant.components.datetime"].DateTimeEntity = type("DateTimeEntity", (Entity,), {})
        modules["homeassistant.helpers.update_coordinator"].CoordinatorEntity = CoordinatorEntity
        modules["homeassistant.components.sensor"].SensorEntity = type("SensorEntity", (Entity,), {})
        modules["homeassistant.components.sensor"].SensorDeviceClass = types.SimpleNamespace(TIMESTAMP="timestamp", ENERGY="energy")
        modules["homeassistant.const"].UnitOfEnergy = types.SimpleNamespace(KILO_WATT_HOUR="kWh")
        self.modules = patch.dict(sys.modules, modules)
        self.modules.start()
        self.number = importlib.import_module("planner_component_test.number")
        self.select = importlib.import_module("planner_component_test.select")
        self.date = importlib.import_module("planner_component_test.datetime")
        self.sensor = importlib.import_module("planner_component_test.sensor")
        self.patches = []

        async def write(value):
            self.patches.append(value)

        self.coordinator = types.SimpleNamespace(data={"planner": {"settings": {"energyKWh": 4, "durationHours": 2, "baseW": 300, "mode": "hourly", "earliest": None, "latest": None}}}, last_update_success=True, async_set_plan=write)
        self.entry = types.SimpleNamespace(entry_id="stable-entry")

    async def asyncTearDown(self):
        self.modules.stop()
        for name in list(sys.modules):
            if name.startswith("planner_component_test"):
                sys.modules.pop(name)

    async def test_inputs_read_server_values_and_write_only_their_field(self):
        number = self.number.PlanNumber(self.coordinator, self.entry, "energyKWh", "Energia", "kWh", .01, 100, .01)
        self.assertEqual(number.native_value, 4)
        await number.async_set_native_value(5)
        mode = self.select.PlanMode(self.coordinator, self.entry, "mode", "Tryb")
        self.assertEqual(mode.current_option, "Godzinowe")
        await mode.async_select_option("15-minutowe")
        boundary = self.date.PlanDateTime(self.coordinator, self.entry, "earliest", "Od")
        self.assertIsNone(boundary.native_value)
        stamp = datetime(2026, 11, 12, 10, tzinfo=timezone.utc)
        await boundary.async_set_value(stamp)
        self.assertEqual(self.patches, [{"energyKWh": 5}, {"mode": "quarterly"}, {"earliest": stamp.timestamp() * 1000}])
        self.assertEqual(number._attr_unique_id, "stable-entry_plan_input_energyKWh")

    async def test_inputs_not_available_with_incompatible_or_failed_app(self):
        mode = self.select.PlanMode(self.coordinator, self.entry, "mode", "Tryb")
        self.assertTrue(mode.available)
        self.coordinator.data = {}
        self.assertFalse(mode.available)

    async def test_night_timestamp_is_unknown_without_marking_the_integration_unavailable(self):
        self.coordinator.data = {"available": True, "days": [{"offset": 0, "kWh": 12.4, "windowStatus": {"oneHour": "produkcja na dziś zakończona"}}]}
        spec = {"key": "best_1h_d0_window_start", "name": "Od", "kind": "window_start", "offset": 0, "length": 1}
        start = self.sensor.PVLabSensor(self.coordinator, self.entry, spec)
        self.assertTrue(start.available)
        self.assertIsNone(start.native_value)
        energy = self.sensor.PVLabSensor(self.coordinator, self.entry, {**spec, "kind": "window_energy"})
        self.assertTrue(energy.available)
        self.assertEqual(energy.native_value, 0)
        tomorrow = self.sensor.PVLabSensor(self.coordinator, self.entry, {**spec, "offset": 1})
        self.assertFalse(tomorrow.available)
        self.coordinator.last_update_success = False
        self.assertFalse(start.available)

    async def test_profile_selectors_use_saved_ids_and_available_variants(self):
        self.coordinator.data['planner']['profiles'] = [{'id': 'washer-eco', 'name': 'Pralka Eco', 'variants': ['typical', 'mean', 'maximum']}, {'id': 'manual', 'name': 'Ręczny test', 'variants': ['typical']}]
        settings = self.coordinator.data['planner']['settings']
        settings.update({'profileId': 'washer-eco', 'profileVariant': 'mean'})
        profile = self.select.PlanProfile(self.coordinator, self.entry, 'profileId', 'Profil')
        variant = self.select.PlanVariant(self.coordinator, self.entry, 'profileVariant', 'Wariant')
        self.assertEqual(profile.current_option, 'Pralka Eco')
        self.assertIn('Pralka Eco', profile.options)
        self.assertEqual(variant.current_option, 'Średni')
        await profile.async_select_option('Ręczne zapotrzebowanie')
        await profile.async_select_option('Ręczny test')
        await variant.async_select_option('Najbardziej energochłonny')
        self.assertEqual(self.patches, [{'profileId': None, 'profileVariant': 'typical'}, {'profileId': 'manual', 'profileVariant': 'typical'}, {'profileVariant': 'maximum'}])
        settings['profileId'] = 'manual'
        self.assertEqual(variant.options, ['Typowy'])
