"""Optional device scheduling boundaries."""
from datetime import datetime, timezone
from homeassistant.components.datetime import DateTimeEntity
from .const import DOMAIN
from .plan_entity import PlanEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities(PlanDateTime(hass.data[DOMAIN][entry.entry_id], entry, key, name) for key, name in (
        ("earliest", "Plan najwcześniejszy start"), ("latest", "Plan najpóźniejsze zakończenie"),
    ))


class PlanDateTime(PlanEntity, DateTimeEntity):
    @property
    def native_value(self):
        value = self.settings.get(self.key)
        return datetime.fromtimestamp(value / 1000, timezone.utc) if value is not None else None

    async def async_set_value(self, value):
        await self.coordinator.async_set_plan({self.key: value.timestamp() * 1000})
