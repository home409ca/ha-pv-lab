"""Shared coordinator-backed planner inputs."""
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, VERSION


class PlanEntity(CoordinatorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator, entry, key, name):
        super().__init__(coordinator)
        self.key = key
        self._attr_unique_id = f"{entry.entry_id}_plan_input_{key}"
        self._attr_name = name
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}

    @property
    def settings(self):
        return (self.coordinator.data or {}).get("planner", {}).get("settings", {})

    @property
    def available(self):
        return super().available and bool(self.settings)
