"""The same appliance state used by the app's planner; no second detector in HA."""
from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorDeviceClass
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.restore_state import RestoreEntity
from .const import DOMAIN, VERSION
from .snow_entity import SnowEntity
from .contract import read_appliance_running, read_dashboard_plan

SPECS = (
    ("zmywarka", "Zmywarka pracuje", "mdi:dishwasher"),
    ("pralka", "Pralka pracuje", "mdi:washing-machine"),
)


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([*(PVLabApplianceRunning(coordinator, entry, *spec) for spec in SPECS), PVLabPlanApproved(coordinator, entry), PVLabScheduledStart(coordinator, entry), SnowSuspected(coordinator, entry)])


class PVLabApplianceRunning(CoordinatorEntity, BinarySensorEntity, RestoreEntity):
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, coordinator, entry, appliance_id, name, icon):
        super().__init__(coordinator)
        self._last_confirmed = None
        self._last_confirmed_at = None
        self.appliance_id = appliance_id
        self._attr_name = name
        self._attr_icon = icon
        self._attr_unique_id = f"{entry.entry_id}_appliance_{appliance_id}_running"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        previous = await self.async_get_last_state()
        if previous and previous.state in ("on", "off"):
            self._last_confirmed = previous.state == "on"
            self._last_confirmed_at = previous.attributes.get("last_confirmed_at")

    def _reading(self):
        value, attrs = read_appliance_running(self.coordinator.data or {}, self.appliance_id)
        fresh = bool(getattr(self.coordinator, "last_update_success", True)) and value is not None
        if fresh:
            self._last_confirmed = value
            row = next((r for r in (self.coordinator.data or {}).get("applianceActivity", {}).get("devices", []) if r.get("id") == self.appliance_id), {})
            self._last_confirmed_at = row.get("readAt")
        return self._last_confirmed, {**attrs, "data_fresh": fresh, "last_confirmed_at": self._last_confirmed_at, "state_source": "pomiar" if fresh else "ostatni potwierdzony stan"}

    @property
    def suggested_object_id(self):
        return f"pv_lab_{self.appliance_id}_pracuje"

    @property
    def available(self):
        return True

    @property
    def is_on(self):
        return self._reading()[0]

    @property
    def extra_state_attributes(self):
        return self._reading()[1]


class PVLabPlanApproved(CoordinatorEntity, BinarySensorEntity):
    _attr_has_entity_name = True
    _attr_icon = "mdi:calendar-check"
    _attr_name = "Plan urządzeń zatwierdzony"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_dashboard_plan_approved"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}

    @property
    def suggested_object_id(self):
        return "pv_lab_plan_urzadzen_zatwierdzony"

    @property
    def available(self):
        value, _ = read_dashboard_plan(self.coordinator.data or {}, "dashboard_approved")
        return super().available and value is not None

    @property
    def is_on(self):
        return read_dashboard_plan(self.coordinator.data or {}, "dashboard_approved")[0]

    @property
    def extra_state_attributes(self):
        return read_dashboard_plan(self.coordinator.data or {}, "dashboard_approved")[1]


class PVLabScheduledStart(PVLabPlanApproved):
    """An armed command still waiting to be sent, rather than physical running."""
    _attr_icon = "mdi:calendar-clock"
    _attr_name = "Zaplanowane uruchomienie"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_scheduled_start_pending"

    @property
    def suggested_object_id(self):
        return "pv_lab_zaplanowane_uruchomienie"

    @property
    def available(self):
        value, _ = read_dashboard_plan(self.coordinator.data or {}, "dashboard_pending")
        return self.coordinator.last_update_success and value is not None

    @property
    def is_on(self):
        return read_dashboard_plan(self.coordinator.data or {}, "dashboard_pending")[0]

    @property
    def extra_state_attributes(self):
        return read_dashboard_plan(self.coordinator.data or {}, "dashboard_pending")[1]


class SnowSuspected(SnowEntity, BinarySensorEntity):
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry, "podejrzenie_zasloniecia_paneli", "Podejrzenie zasłonięcia paneli", "mdi:solar-panel")

    @property
    def is_on(self):
        return (self.snow or {}).get("active")
