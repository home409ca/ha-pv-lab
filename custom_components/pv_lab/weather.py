"""Weather readout: observed current conditions and independently timestamped forecasts."""
from datetime import datetime, timezone
from math import isfinite
from homeassistant.components.weather import WeatherEntity, WeatherEntityFeature
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN, VERSION


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value)


def weather_payload(coordinator):
    payload = (coordinator.data or {}).get('weather') or {}
    now = datetime.now(timezone.utc).timestamp() * 1000
    at = payload.get('at')
    current = payload.get('current') or {}
    current_at = current.get('at')
    age = payload.get('ageSeconds')
    valid = (coordinator.last_update_success and payload.get('schema') == 1
             and payload.get('available') is True and number(at) and -60000 <= now-at <= 600000
             and number(current_at) and -60000 <= now-current_at <= 7200000
             and number(age) and 0 <= age <= 7200 and number(current.get('temperature')))
    return payload, bool(valid)


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([PVLabWeather(hass.data[DOMAIN][entry.entry_id], entry)])


class PVLabWeather(CoordinatorEntity, WeatherEntity):
    _attr_has_entity_name = False
    _attr_name = 'PV Lab'
    _attr_native_temperature_unit = '°C'
    _attr_native_wind_speed_unit = 'm/s'
    _attr_native_precipitation_unit = 'mm'
    _attr_native_pressure_unit = 'hPa'
    _attr_supported_features = WeatherEntityFeature.FORECAST_HOURLY

    def __init__(self, coordinator, entry):
        super().__init__(coordinator)
        self._attr_unique_id = f'{entry.entry_id}_weather'
        self._attr_device_info = {'identifiers': {(DOMAIN, entry.entry_id)}, 'name': 'PV Lab', 'manufacturer': 'PV Lab', 'model': 'Local PV forecast', 'sw_version': VERSION}

    @property
    def suggested_object_id(self):
        return 'pv_lab'

    @property
    def available(self):
        return weather_payload(self.coordinator)[1]

    def current(self, key):
        payload, valid = weather_payload(self.coordinator)
        return (payload.get('current') or {}).get(key) if valid else None

    @property
    def condition(self):
        return self.current('condition')

    @property
    def native_temperature(self):
        return self.current('temperature')

    @property
    def native_dew_point(self):
        return self.current('dewPoint')

    @property
    def native_pressure(self):
        return self.current('pressure')

    @property
    def humidity(self):
        return self.current('humidity')

    @property
    def cloud_coverage(self):
        return self.current('cloud')

    @property
    def native_wind_speed(self):
        return self.current('windSpeed')

    @property
    def wind_bearing(self):
        return self.current('windBearing')

    @property
    def extra_state_attributes(self):
        payload, _ = weather_payload(self.coordinator)
        current = payload.get('current') or {}
        return {'pv_lab_weather': True, 'forecast_source': payload.get('source'), 'current_source': current.get('source'), 'current_kind': current.get('kind'), 'forecast_retrieval_age_seconds': payload.get('ageSeconds'), 'quality': payload.get('quality'), 'requested_variant': payload.get('requestedVariant'), 'influence_on_pv': 0}

    async def async_forecast_hourly(self):
        payload, valid = weather_payload(self.coordinator)
        if not valid:
            return None
        now = datetime.now(timezone.utc).timestamp()*1000
        result = []
        names = {'pressure': 'native_pressure', 'temperature': 'native_temperature', 'humidity': 'humidity', 'dewPoint': 'native_dew_point', 'cloud': 'cloud_coverage', 'precipitation': 'native_precipitation', 'probability': 'precipitation_probability', 'windSpeed': 'native_wind_speed', 'windBearing': 'wind_bearing'}
        for row in payload.get('hourly', []):
            start = row.get('start')
            if not number(start) or start+3600000 <= now:
                continue
            forecast = {'datetime': datetime.fromtimestamp(start/1000, timezone.utc).isoformat()}
            if isinstance(row.get('condition'), str):
                forecast['condition'] = row['condition']
            for key, target in names.items():
                if number(row.get(key)):
                    forecast[target] = row[key]
            result.append(forecast)
        return result or None

    def _handle_coordinator_update(self):
        super()._handle_coordinator_update()
        self.hass.async_create_task(self.async_update_listeners(None))
