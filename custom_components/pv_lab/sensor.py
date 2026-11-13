"""Expose forecast values; never treat forecasts as cumulative measured energy."""
from datetime import datetime, timezone
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.const import UnitOfEnergy
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, VERSION
from .contract import sensor_specs, read_sensor


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(PVLabSensor(coordinator, entry, spec) for spec in sensor_specs())


class PVLabSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator, entry, spec):
        super().__init__(coordinator)
        self.spec = spec
        self._attr_unique_id = f"{entry.entry_id}_{spec['key']}"
        self._attr_name = spec["name"]
        self._attr_entity_registry_enabled_default = spec.get("enabled", True)
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}
        if spec["kind"] in ("window_start", "revision_time", "calculated_at", "planner_start", "planner_end", "planner_calculated", "optimizer_start", "optimizer_updated"):
            self._attr_device_class = SensorDeviceClass.TIMESTAMP
        elif spec["kind"] in ("optimizer_cost", "optimizer_total_cost"):
            self._attr_native_unit_of_measurement = "PLN"
        elif spec["kind"] == "planner_percent":
            self._attr_native_unit_of_measurement = "%"
        elif spec["kind"] not in ("revision_direction", "window_status", "planner_status", "balance_source", "optimizer_status", "optimizer_device_status"):
            self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
            if spec["kind"] != "revision_delta":
                self._attr_device_class = SensorDeviceClass.ENERGY
        # No total / total_increasing state_class: a revised forecast is not a production counter.

    @property
    def suggested_object_id(self):
        return self.spec["key"]

    @property
    def available(self):
        value, _ = read_sensor(self.coordinator.data or {}, self.spec)
        return super().available and bool((self.coordinator.data or {}).get("available")) and (value is not None or self.spec["kind"] == "window_start" and self.spec.get("offset") == 0)

    @property
    def native_value(self):
        value, _ = read_sensor(self.coordinator.data or {}, self.spec)
        if value is None:
            return None
        if self.spec["kind"] in ("window_start", "revision_time", "planner_start", "planner_end", "planner_calculated", "optimizer_start", "optimizer_updated"):
            return datetime.fromtimestamp(value / 1000, timezone.utc)
        if self.spec["kind"] == "calculated_at":
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return round(value, 3) if isinstance(value, (int, float)) else value

    @property
    def extra_state_attributes(self):
        return read_sensor(self.coordinator.data or {}, self.spec)[1]
