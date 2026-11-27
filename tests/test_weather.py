"""Verify weather entity contract without installing Home Assistant or calling hardware."""
import importlib
import pathlib
import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, Mock
ROOT=pathlib.Path(__file__).resolve().parents[1]/'custom_components/pv_lab'
class Coordinator:
    def __init__(self, coordinator):
        self.coordinator=coordinator
        self.hass=coordinator.hass
    def _handle_coordinator_update(self):
        pass
class Weather:
    async_update_listeners=AsyncMock()
class Sensor:
    pass
class WeatherTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        package=types.ModuleType('weather_test_component');package.__path__=[str(ROOT)]
        mods={'weather_test_component':package}
        for key in ['homeassistant','homeassistant.components','homeassistant.components.weather','homeassistant.components.sensor','homeassistant.helpers','homeassistant.helpers.update_coordinator']:
            mods[key]=types.ModuleType(key)
        mods['homeassistant.components.weather'].WeatherEntity=Weather
        mods['homeassistant.components.weather'].WeatherEntityFeature=types.SimpleNamespace(FORECAST_HOURLY=2)
        mods['homeassistant.helpers.update_coordinator'].CoordinatorEntity=Coordinator
        mods['homeassistant.components.sensor'].SensorEntity=Sensor
        self.patch=patch.dict(sys.modules,mods);self.patch.start()
        self.mod=importlib.import_module('weather_test_component.weather')
        self.diag=importlib.import_module('weather_test_component.weather_diagnostics')
        self.now=datetime.now(timezone.utc).timestamp()*1000
        self.payload={'schema':1,'at':self.now,'available':True,'ageSeconds':20,'source':'weather.dom','current':{'temperature':0,'humidity':80,'condition':'cloudy','at':self.now,'source':'weather.dom'},'hourly':[{'start':self.now+3600000,'temperature':0,'humidity':None,'precipitation':0,'condition':'cloudy'}]}
        self.c=types.SimpleNamespace(data={'weather':self.payload},last_update_success=True,hass=types.SimpleNamespace(async_create_task=Mock()))
        self.entry=types.SimpleNamespace(entry_id='test')
        self.entity=self.mod.PVLabWeather(self.c,self.entry)
    def tearDown(self):
        self.patch.stop()
        for key in list(sys.modules):
            if key.startswith('weather_test_component'):
                del sys.modules[key]
    async def test_forecast_uses_native_units_and_preserves_real_zeros_and_missing_values(self):
        self.assertTrue(self.entity.available)
        rows=await self.entity.async_forecast_hourly()
        self.assertEqual(rows[0]['native_temperature'],0)
        self.assertEqual(rows[0]['native_precipitation'],0)
        self.assertNotIn('humidity',rows[0])
        self.assertIn('+00:00',rows[0]['datetime'])
        self.assertTrue(self.entity.extra_state_attributes['pv_lab_weather'])
    async def test_old_or_unavailable_payload_never_pretends_to_be_fresh_weather(self):
        for change in [{'at':self.now-700000},{'available':False},{'ageSeconds':8000},{'schema':3}]:
            old=self.c.data['weather'];self.c.data={'weather':{**self.payload,**change}}
            self.assertFalse(self.entity.available)
            self.assertIsNone(await self.entity.async_forecast_hourly())
            self.c.data={'weather':old}
    async def test_current_observation_is_never_taken_from_the_future_forecast(self):
        self.payload['current']['temperature']=4
        self.payload['hourly'][0]['temperature']=20
        self.assertEqual(self.entity.native_temperature,4)
        self.assertEqual((await self.entity.async_forecast_hourly())[0]['native_temperature'],20)
    async def test_diagnostics_do_not_depend_on_solar_producing(self):
        self.c.data['available']=False
        entity=self.diag.WeatherDiagnostic(self.c,self.entry,'availability','Pogoda')
        self.assertEqual(entity.native_value,'dostępna')
        source=self.diag.WeatherDiagnostic(self.c,self.entry,'source','Źródło')
        self.assertEqual(source.native_value,'weather.dom')
    async def test_platform_setup_adds_weather_with_stable_identity(self):
        added=[]
        hass=types.SimpleNamespace(data={'pv_lab':{'test':self.c}})
        await self.mod.async_setup_entry(hass,self.entry,added.extend)
        self.assertEqual(len(added),1)
        self.assertEqual(added[0].suggested_object_id,'pv_lab')
