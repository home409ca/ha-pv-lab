"""The same appliance state used by the app's planner; no second detector in HA."""
from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorDeviceClass
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, VERSION
from .contract import read_appliance_running, read_dashboard_plan

SPECS = (
    ("pralka", "Pralka pracuje", "mdi:washing-machine"),
    ("zmywarka", "Zmywarka pracuje", "mdi:dishwasher"),
)


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([*(PVLabApplianceRunning(coordinator, entry, *spec) for spec in SPECS), PVLabPlanApproved(coordinator, entry)])


class PVLabApplianceRunning(CoordinatorEntity, BinarySensorEntity):
    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, coordinator, entry, appliance_id, name, icon):
        super().__init__(coordinator)
        self.appliance_id = appliance_id
        self._attr_name = name
        self._attr_icon = icon
        self._attr_unique_id = f"{entry.entry_id}_appliance_{appliance_id}_running"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)}, "name": "PV Lab", "manufacturer": "PV Lab", "model": "Local PV forecast", "sw_version": VERSION}

    @property
    def suggested_object_id(self):
        return f"pv_lab_{self.appliance_id}_pracuje"

    @property
    def available(self):
        # Independent of solar-forecast availability, including during the night.
        value, _ = read_appliance_running(self.coordinator.data or {}, self.appliance_id)
        return super().available and value is not None

    @property
    def is_on(self):
        return read_appliance_running(self.coordinator.data or {}, self.appliance_id)[0]

    @property
    def extra_state_attributes(self):
        return read_appliance_running(self.coordinator.data or {}, self.appliance_id)[1]


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
