"""Supply the forecast overlay to the native Energy dashboard."""
from .const import DOMAIN
from .contract import hourly_forecast


async def async_get_solar_forecast(hass, config_entry_id):
    coordinator = hass.data.get(DOMAIN, {}).get(config_entry_id)
    if coordinator is None or not coordinator.last_update_success or not coordinator.data.get("available"):
        return None
    return {"wh_hours": hourly_forecast(coordinator.data)}
