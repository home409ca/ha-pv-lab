"""Native switch for automatic PV obstruction correction."""
from homeassistant.components.switch import SwitchEntity
from .const import DOMAIN
from .snow_entity import SnowEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([SnowCorrection(hass.data[DOMAIN][entry.entry_id], entry)])


class SnowCorrection(SnowEntity, SwitchEntity):
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry, "korekta_zasloniecia_paneli", "Automatyczna korekta zasłonięcia paneli", "mdi:snowflake")

    @property
    def is_on(self):
        return (self.snow or {}).get("enabled")

    async def async_turn_on(self, **kwargs):
        await self.coordinator.async_set_snow({"enabled": True})

    async def async_turn_off(self, **kwargs):
        await self.coordinator.async_set_snow({"enabled": False})
