"""PV Lab entities and Energy forecast platform."""
from datetime import timedelta
from aiohttp import ClientError
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from .api import AuthenticationError, fetch_payload, update_plan, update_snow
from .const import DOMAIN, CONF_URL, CONF_TOKEN
import logging

LOGGER = logging.getLogger(__name__)


class PVLabCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        super().__init__(hass, LOGGER, name="PV Lab", config_entry=entry, update_interval=timedelta(seconds=60))
        self.entry = entry
        self.executor = None

    async def async_set_plan(self, patch):
        await update_plan(async_get_clientsession(self.hass), self.entry.data[CONF_URL], self.entry.data[CONF_TOKEN], patch)
        await self.async_request_refresh()

    async def async_set_snow(self, patch):
        await update_snow(async_get_clientsession(self.hass), self.entry.data[CONF_URL], self.entry.data[CONF_TOKEN], patch)
        await self.async_request_refresh()

    async def _async_update_data(self):
        try:
            payload = await fetch_payload(async_get_clientsession(self.hass), self.entry.data[CONF_URL], self.entry.data[CONF_TOKEN])
            if self.executor:
                await self.executor.async_accept(payload.get("devicePlanning", {}))
                payload["devicePlanning"] = self.executor.present(payload.get("devicePlanning", {}))
            return payload
        except AuthenticationError as err:
            raise ConfigEntryAuthFailed("PV Lab pairing key was rejected") from err
        except (ClientError, TimeoutError, ValueError) as err:
            raise UpdateFailed("Cannot read the PV Lab app") from err


async def async_setup_entry(hass, entry):
    # Serve the card even when the app is temporarily offline and setup is retried.
    from .dashboard import async_setup_dashboard
    await async_setup_dashboard(hass)
    coordinator = PVLabCoordinator(hass, entry)
    from .executor import PlanExecutor
    from homeassistant.exceptions import ConfigEntryNotReady
    coordinator.executor = PlanExecutor(hass, entry)
    await coordinator.executor.async_setup()
    try:
        await coordinator.async_config_entry_first_refresh()
    except ConfigEntryNotReady:
        if not coordinator.executor.data.get("plan") and not coordinator.executor.data.get("autoSetup"):
            await coordinator.executor.async_stop()
            raise
        # Keep locally stored approved commands alive while the app is offline.
        coordinator.async_set_updated_data({"schema": 1, "days": [], "available": False})
        coordinator.last_update_success = False
    except Exception:
        await coordinator.executor.async_stop()
        raise
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    try:
        await hass.config_entries.async_forward_entry_setups(entry, [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.NUMBER, Platform.SELECT, Platform.DATETIME, Platform.SWITCH, Platform.BUTTON])
    except Exception:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        await coordinator.executor.async_stop()
        raise
    return True


async def async_unload_entry(hass, entry):
    unloaded = await hass.config_entries.async_unload_platforms(entry, [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.NUMBER, Platform.SELECT, Platform.DATETIME, Platform.SWITCH, Platform.BUTTON])
    if unloaded:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id, None)
        if coordinator and coordinator.executor:
            await coordinator.executor.async_stop()
    return unloaded
