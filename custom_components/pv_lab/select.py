"""Select the temporal energy balancing mode."""
from homeassistant.components.select import SelectEntity
from .const import DOMAIN
from .plan_entity import PlanEntity

MODES = {"hourly": "Godzinowe", "quarterly": "15-minutowe", "instant": "Bez bilansowania czasowego"}


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([PlanMode(hass.data[DOMAIN][entry.entry_id], entry, "mode", "Plan bilansowanie")])


class PlanMode(PlanEntity, SelectEntity):
    _attr_options = list(MODES.values())

    @property
    def current_option(self):
        return MODES.get(self.settings.get("mode"))

    async def async_select_option(self, option):
        await self.coordinator.async_set_plan({"mode": next(key for key, value in MODES.items() if value == option)})
