"""PV Lab entities and Energy forecast platform."""
from datetime import timedelta
from aiohttp import ClientError
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from .api import AuthenticationError, fetch_payload
from .const import DOMAIN, CONF_URL, CONF_TOKEN
import logging

LOGGER = logging.getLogger(__name__)


class PVLabCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        super().__init__(hass, LOGGER, name="PV Lab", config_entry=entry, update_interval=timedelta(seconds=60))
        self.entry = entry

    async def _async_update_data(self):
        try:
            return await fetch_payload(async_get_clientsession(self.hass), self.entry.data[CONF_URL], self.entry.data[CONF_TOKEN])
        except AuthenticationError as err:
            raise ConfigEntryAuthFailed("PV Lab pairing key was rejected") from err
        except (ClientError, TimeoutError, ValueError) as err:
            raise UpdateFailed("Cannot read the PV Lab app") from err


async def async_setup_entry(hass, entry):
    coordinator = PVLabCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, [Platform.SENSOR])
    return True


async def async_unload_entry(hass, entry):
    unloaded = await hass.config_entries.async_unload_platforms(entry, [Platform.SENSOR])
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unloaded
