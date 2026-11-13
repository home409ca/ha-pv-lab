"""Native Energy platform history and live availability contract."""
import importlib
import pathlib
import sys
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'custom_components' / 'pv_lab'


class EnergyArchiveTests(unittest.IsolatedAsyncioTestCase):
    async def test_history_survives_live_unavailability(self):
        package = types.ModuleType('energy_component_test')
        package.__path__ = [str(ROOT)]
        with patch.dict(sys.modules, {'energy_component_test': package}):
            module = importlib.import_module('energy_component_test.energy')
            past, future = '2020-01-01T10:00:00Z', '2099-01-01T10:00:00Z'
            coordinator = types.SimpleNamespace(last_update_success=True, data={
                'available': True, 'energyWhHours': {past: 1000, future: 2000}})
            hass = types.SimpleNamespace(data={module.DOMAIN: {'entry': coordinator}})
            self.assertEqual(len((await module.async_get_solar_forecast(hass, 'entry'))['wh_hours']), 2)
            for live_ok, available in [(True, False), (False, True), (False, False)]:
                coordinator.last_update_success = live_ok
                coordinator.data['available'] = available
                self.assertEqual((await module.async_get_solar_forecast(hass, 'entry'))['wh_hours'], {'2020-01-01T10:00:00+00:00': 1000})
            coordinator.data = {'available': False, 'periods': []}
            self.assertIsNone(await module.async_get_solar_forecast(hass, 'entry'))

    async def test_archive_mapping_rejects_invalid_values(self):
        package = types.ModuleType('energy_contract_test')
        package.__path__ = [str(ROOT)]
        with patch.dict(sys.modules, {'energy_contract_test': package}):
            contract = importlib.import_module('energy_contract_test.contract')
            payload = {'energyWhHours': {
                '2026-01-01T10:00:00Z': 0,
                '2026-01-01T11:00:00Z': -1,
                '2026-01-01T12:00:00Z': float('nan'),
                '2026-01-01T13:30:00Z': 1,
                '2026-01-01T14:00:00': 1,
                'invalid': 1}}
            self.assertEqual(contract.hourly_forecast(payload), {'2026-01-01T10:00:00+00:00': 0})
