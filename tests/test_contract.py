import importlib.util
import pathlib
import unittest

source = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "pv_lab" / "contract.py"
spec = importlib.util.spec_from_file_location("contract", source)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class ContractTests(unittest.TestCase):
    def test_sensor_count_and_enabled_defaults(self):
        specs = contract.sensor_specs()
        self.assertEqual(len(specs), 49)
        self.assertEqual(len({s["key"] for s in specs}), 49)
        self.assertEqual(sum(s.get("enabled", True) for s in specs), 25)

    def test_zero_is_valid_and_missing_is_not_zero(self):
        spec = {"kind": "energy", "offset": 0}
        self.assertEqual(contract.read_sensor({"days": [{"offset": 0, "kWh": 0}]}, spec)[0], 0)
        self.assertIsNone(contract.read_sensor({"days": []}, spec)[0])

    def test_peak_attributes_and_revision(self):
        day = {"offset": 0, "windows": {"twoHours": {"start": 1800000000000, "end": 1800007200000, "kWh": 5, "hours": 2}}, "revision": {"direction": "down", "deltaKWh": -.2}}
        value, attrs = contract.read_sensor({"days": [day]}, {"kind": "window_start", "length": 2, "offset": 0})
        self.assertEqual(value, 1800000000000)
        self.assertEqual(attrs["energy_kwh"], 5)
        self.assertTrue(attrs["end"].endswith("+00:00"))
        self.assertEqual(contract.read_sensor({"days": [day]}, {"kind": "revision_direction", "offset": 0})[0], "spadek")

    def test_energy_aggregation_requires_complete_hour(self):
        rows = [{"start": f"2026-06-10T10:{m:02d}:00+00:00", "wh": 250} for m in (0, 15, 30, 45)]
        self.assertEqual(sum(contract.hourly_forecast({"periods": rows}).values()), 1000)
        self.assertEqual(contract.hourly_forecast({"periods": rows[:3]}), {})
        self.assertEqual(sum(contract.hourly_forecast({"periods": rows + [rows[0]]}).values()), 1000)


if __name__ == "__main__":
    unittest.main()
