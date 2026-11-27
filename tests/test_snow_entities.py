"""Native HA snow status/controls without HA installation or hardware calls."""
import importlib
import pathlib
import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

ROOT = pathlib.Path(__file__).resolve().parents[1] / "custom_components/pv_lab"


class Entity:
    pass


class CoordinatorEntity:
    def __init__(self, coordinator):
        self.coordinator = coordinator
        self.hass = coordinator.hass

    @property
    def available(self):
        return self.coordinator.last_update_success


class SnowEntitiesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        package = types.ModuleType("snow_component_test")
        package.__path__ = [str(ROOT)]
        modules = {"snow_component_test": package}
        for name in ("homeassistant", "homeassistant.components", "homeassistant.helpers", "homeassistant.helpers.update_coordinator", "homeassistant.helpers.restore_state"):
            modules[name] = types.ModuleType(name)
        modules["homeassistant.helpers.update_coordinator"].CoordinatorEntity = CoordinatorEntity
        modules["homeassistant.helpers.restore_state"].RestoreEntity = Entity
        for platform, cls in (("binary_sensor", "BinarySensorEntity"), ("switch", "SwitchEntity"), ("button", "ButtonEntity"), ("select", "SelectEntity")):
            mod = types.ModuleType("homeassistant.components." + platform)
            setattr(mod, cls, type(cls, (Entity,), {}))
            if platform == "binary_sensor":
                mod.BinarySensorDeviceClass = types.SimpleNamespace(RUNNING="running")
            modules[mod.__name__] = mod
        self.patch = patch.dict(sys.modules, modules)
        self.patch.start()
        self.binary = importlib.import_module("snow_component_test.binary_sensor")
        self.switch = importlib.import_module("snow_component_test.switch")
        self.button = importlib.import_module("snow_component_test.button")
        self.select = importlib.import_module("snow_component_test.select")
        self.contract = importlib.import_module("snow_component_test.contract")
        self.now = datetime.now(timezone.utc).timestamp()*1000
        self.state = {"readAt": self.now, "enabled": True, "active": True, "factor": .1, "reason": "Podejrzenie", "weatherEntity": "weather.dom"}
        hass = types.SimpleNamespace(states=types.SimpleNamespace(async_all=lambda domain: [types.SimpleNamespace(entity_id="weather.dom"), types.SimpleNamespace(entity_id="weather.ogrod")]))
        self.coordinator = types.SimpleNamespace(data={"snowCorrection": self.state}, last_update_success=True, async_set_snow=AsyncMock(), hass=hass)
        self.entry = types.SimpleNamespace(entry_id="stable")

    async def asyncTearDown(self):
        self.patch.stop()
        for name in list(sys.modules):
            if name.startswith("snow_component_test"):
                del sys.modules[name]

    async def test_switch_and_clear_button_only_send_restricted_settings(self):
        switch = self.switch.SnowCorrection(self.coordinator, self.entry)
        button = self.button.ClearSnow(self.coordinator, self.entry)
        self.assertTrue(switch.available)
        self.assertTrue(switch.is_on)
        await switch.async_turn_off()
        self.coordinator.async_set_snow.assert_awaited_with({"enabled": False})
        await switch.async_turn_on()
        self.coordinator.async_set_snow.assert_awaited_with({"enabled": True})
        await button.async_press()
        self.coordinator.async_set_snow.assert_awaited_with({"action": "clear"})
        self.assertEqual(button.suggested_object_id, "pv_lab_potwierdz_odsloniecie_paneli")

    async def test_status_is_distinct_from_switch_and_unknown_is_not_off(self):
        sensor = self.binary.SnowSuspected(self.coordinator, self.entry)
        self.assertTrue(sensor.is_on)
        self.assertEqual(sensor.extra_state_attributes["limit_percent"], 10)
        self.assertEqual(sensor.suggested_object_id, "pv_lab_podejrzenie_zasloniecia_paneli")
        self.state["active"] = False
        self.assertFalse(sensor.is_on)
        self.assertTrue(self.switch.SnowCorrection(self.coordinator, self.entry).is_on)
        self.state["readAt"] -= 181000
        self.assertFalse(sensor.available)
        self.assertIsNone(sensor.is_on)
        self.coordinator.data = {}
        self.assertFalse(sensor.available)

    async def test_weather_selector_lists_real_weather_entities_and_can_be_disabled(self):
        entity = self.select.SnowWeather(self.coordinator, self.entry)
        self.assertEqual(entity.options, ["Bez encji pogody", "weather.dom", "weather.ogrod"])
        self.assertEqual(entity.current_option, "weather.dom")
        await entity.async_select_option("weather.ogrod")
        self.coordinator.async_set_snow.assert_awaited_with({"weatherEntity": "weather.ogrod"})
        await entity.async_select_option("Bez encji pogody")
        self.coordinator.async_set_snow.assert_awaited_with({"weatherEntity": ""})

    async def test_invalid_payload_is_never_reported_as_confirmed_snow(self):
        for patch_value in ({"enabled": "on"}, {"factor": float("nan")}, {"factor": 2}, {"readAt": True}, {"active": None}):
            self.assertIsNone(self.contract.read_snow({"snowCorrection": {**self.state, **patch_value}}, self.now))
