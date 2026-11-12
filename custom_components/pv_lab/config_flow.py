"""Configure PV Lab through Devices & services."""
from urllib.parse import urlsplit
import voluptuous as vol
from aiohttp import ClientError
from homeassistant import config_entries
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import AuthenticationError, fetch_payload
from .const import DOMAIN, CONF_URL, CONF_TOKEN


class PVLabConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            url = user_input[CONF_URL].strip().rstrip("/")
            token = user_input[CONF_TOKEN].strip()
            parts = urlsplit(url)
            if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment or parts.path not in ("", "/"):
                errors["base"] = "invalid_url"
            else:
                try:
                    await fetch_payload(async_get_clientsession(self.hass), url, token)
                except AuthenticationError:
                    errors["base"] = "invalid_auth"
                except (ClientError, TimeoutError, ValueError):
                    errors["base"] = "cannot_connect"
                else:
                    await self.async_set_unique_id(url.lower())
                    self._abort_if_unique_id_configured()
                    return self.async_create_entry(title="PV Lab", data={CONF_URL: url, CONF_TOKEN: token})
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_URL, default=(user_input or {}).get(CONF_URL, "http://local-pv-lab:8099")): str,
                vol.Required(CONF_TOKEN): selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)),
            }),
            errors=errors,
        )
