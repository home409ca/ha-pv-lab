"""Select the temporal energy balancing mode."""
from homeassistant.components.select import SelectEntity
from .const import DOMAIN
from .plan_entity import PlanEntity

MODES = {"hourly": "Godzinowe", "quarterly": "15-minutowe", "instant": "Bez bilansowania czasowego"}
VARIANTS = {"typical": "Typowy", "mean": "Średni", "maximum": "Najbardziej energochłonny"}


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PlanMode(coordinator, entry, "mode", "Plan bilansowanie"),
        PlanProfile(coordinator, entry, "profileId", "Plan profil urządzenia"),
        PlanVariant(coordinator, entry, "profileVariant", "Plan wariant profilu"),
    ])


class PlanMode(PlanEntity, SelectEntity):
    _attr_options = list(MODES.values())

    @property
    def current_option(self):
        return MODES.get(self.settings.get("mode"))

    async def async_select_option(self, option):
        await self.coordinator.async_set_plan({"mode": next(key for key, value in MODES.items() if value == option)})


class PlanProfile(PlanEntity, SelectEntity):
    @property
    def profiles(self):
        return (self.coordinator.data or {}).get("planner", {}).get("profiles", [])

    @property
    def options(self):
        return ["Ręczne zapotrzebowanie", *[p["name"] for p in self.profiles]]

    @property
    def current_option(self):
        profile = next((p for p in self.profiles if p["id"] == self.settings.get("profileId")), None)
        return profile["name"] if profile else "Ręczne zapotrzebowanie"

    async def async_select_option(self, option):
        profile = next((p for p in self.profiles if p["name"] == option), None)
        await self.coordinator.async_set_plan({"profileId": profile["id"] if profile else None, "profileVariant": "typical"})


class PlanVariant(PlanEntity, SelectEntity):
    @property
    def options(self):
        profiles = (self.coordinator.data or {}).get("planner", {}).get("profiles", [])
        profile = next((p for p in profiles if p["id"] == self.settings.get("profileId")), None)
        return [VARIANTS[key] for key in (profile.get("variants", ["typical"]) if profile else VARIANTS)]

    @property
    def current_option(self):
        return VARIANTS.get(self.settings.get("profileVariant", "typical"))

    async def async_select_option(self, option):
        await self.coordinator.async_set_plan({"profileVariant": next(key for key, value in VARIANTS.items() if value == option)})
