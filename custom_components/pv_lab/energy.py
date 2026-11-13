"""Supply the forecast overlay to the native Energy dashboard."""
from datetime import datetime, timezone
from .const import DOMAIN
from .contract import hourly_forecast


async def async_get_solar_forecast(hass, config_entry_id):
    coordinator = hass.data.get(DOMAIN, {}).get(config_entry_id)
    if coordinator is None or not coordinator.data:
        return None
    payload = coordinator.data
    if not isinstance(payload.get("energyWhHours"), dict) and (not coordinator.last_update_success or not payload.get("available")):
        return None
    hours = hourly_forecast(payload)
    if not coordinator.last_update_success or not payload.get("available"):
        # Historical forecasts remain useful during an outage. Stale future values do not.
        now = datetime.now(timezone.utc).timestamp()
        hours = {start: wh for start, wh in hours.items() if datetime.fromisoformat(start).timestamp() + 3600 <= now}
    return {"wh_hours": hours}
