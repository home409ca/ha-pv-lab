"""Explicit user confirmation; does not operate a physical device."""
from homeassistant.components.button import ButtonEntity
from .const import DOMAIN
from .snow_entity import SnowEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ClearSnow(hass.data[DOMAIN][entry.entry_id], entry)])


class ClearSnow(SnowEntity, ButtonEntity):
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry, "potwierdz_odsloniecie_paneli", "Potwierdź odsłonięcie paneli", "mdi:weather-sunny")

    async def async_press(self):
        await self.coordinator.async_set_snow({"action": "clear"})
