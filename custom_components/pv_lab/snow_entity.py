"""Shared state and identity for native HA snow controls."""
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, VERSION
from .contract import read_snow


class SnowEntity(CoordinatorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator, entry, key, name, icon):
        super().__init__(coordinator)
        self.key = key
        self._attr_name = name
        self._attr_icon = icon
        self._attr_unique_id = f"{entry.entry_id}_snow_{key}"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}

    @property
    def suggested_object_id(self):
        return f"pv_lab_{self.key}"

    @property
    def snow(self):
        return read_snow(self.coordinator.data or {})

    @property
    def available(self):
        return super().available and self.snow is not None

    @property
    def extra_state_attributes(self):
        s = self.snow or {}
        return {"reason": s.get("reason"), "limit_percent": s.get("factor", 1)*100,
                "detected_at": s.get("detectedAt"), "weather_entity": s.get("weatherEntity"),
                "observations": s.get("window"), "note": "Podejrzenie, nie potwierdzona diagnoza. Limit pozostaje do powrotu produkcji lub ręcznego potwierdzenia odsłonięcia."}
