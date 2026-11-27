"""Small independent weather diagnostics; do not depend on solar being available."""
from datetime import datetime, timezone
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN


class WeatherDiagnostic(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True
    _attr_entity_category = 'diagnostic'

    def __init__(self, coordinator, entry, key, name):
        super().__init__(coordinator)
        self.key = key
        self._attr_name = name
        self._attr_unique_id = f'{entry.entry_id}_weather_{key}'
        self._attr_device_info = {'identifiers': {(DOMAIN, entry.entry_id)}}
        if key == 'ageSeconds':
            self._attr_native_unit_of_measurement = 's'

    @property
    def suggested_object_id(self):
        return 'pv_lab_weather_' + self.key.lower()

    @property
    def native_value(self):
        from .weather import weather_payload
        p, valid = weather_payload(self.coordinator)
        if self.key == 'availability':
            return 'dostępna' if valid else 'brak świeżych danych'
        if self.key == 'ageSeconds':
            age = p.get('ageSeconds')
            at = p.get('at')
            if not isinstance(age, (int, float)) or not isinstance(at, (int, float)):
                return None
            return round(age + max(0, datetime.now(timezone.utc).timestamp() - at/1000))
        return p.get(self.key)
