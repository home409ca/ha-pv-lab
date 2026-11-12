"""Editable energy requirement, duration and household reserve."""
from homeassistant.components.number import NumberEntity, NumberMode
from .const import DOMAIN
from .plan_entity import PlanEntity


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(PlanNumber(coordinator, entry, *spec) for spec in (
        ("energyKWh", "Plan zapotrzebowanie energii", "kWh", .01, 100, .01),
        ("durationHours", "Plan czas pracy", "h", .25, 24, .25),
        ("baseW", "Plan rezerwa mocy domu", "W", 0, 50000, 10),
    ))


class PlanNumber(PlanEntity, NumberEntity):
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator, entry, key, name, unit, minimum, maximum, step):
        super().__init__(coordinator, entry, key, name)
        self._attr_native_unit_of_measurement = unit
        self._attr_native_min_value = minimum
        self._attr_native_max_value = maximum
        self._attr_native_step = step

    @property
    def native_value(self):
        return self.settings.get(self.key)

    async def async_set_native_value(self, value):
        await self.coordinator.async_set_plan({self.key: value})
