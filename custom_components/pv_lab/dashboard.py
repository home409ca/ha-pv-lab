"""Native dashboard card registration and a narrow authenticated planner bridge."""
import asyncio
from pathlib import Path
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from aiohttp import ClientError
from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import AuthenticationError, device_schedule
from .const import DOMAIN, CONF_URL, CONF_TOKEN, VERSION


async def async_setup_dashboard(hass):
    lock = hass.data.setdefault("pv_lab_dashboard_lock", asyncio.Lock())
    async with lock:
        await _setup_dashboard_once(hass)


async def _setup_dashboard_once(hass):
    if hass.data.get("pv_lab_dashboard_loaded"):
        return
    await hass.http.async_register_static_paths([StaticPathConfig("/pv_lab_frontend", str(Path(__file__).parent / "www"), False)])
    add_extra_js_url(hass, f"/pv_lab_frontend/pv-lab-plan-card.js?v={VERSION}")
    websocket_api.async_register_command(hass, ws_entries)
    websocket_api.async_register_command(hass, ws_schedule)
    hass.data["pv_lab_dashboard_loaded"] = True


@websocket_api.websocket_command({vol.Required("type"): "pv_lab/planner_entries"})
@websocket_api.async_response
async def ws_entries(hass, connection, msg):
    connection.send_result(msg["id"], [{"entry_id": key, "title": coordinator.entry.title} for key, coordinator in hass.data.get(DOMAIN, {}).items()])


@websocket_api.websocket_command({
    vol.Required("type"): "pv_lab/device_schedule",
    vol.Required("entry_id"): str,
    vol.Required("action"): vol.In(["status", "preview", "approve", "cancel", "mode", "auto", "auto_continuous"]),
    vol.Optional("execution_schema"): vol.In([1]),
    vol.Optional("mode"): vol.In(["fixed", "flexible", "finish"]),
    vol.Optional("enabled"): bool,
    vol.Optional("counts"): {vol.Required("pralka"): vol.All(int, vol.Range(min=0, max=8)), vol.Required("zmywarka"): vol.All(int, vol.Range(min=0, max=8))},
    vol.Optional("profile_ids"): {vol.Optional("pralka"): vol.Any(None, str), vol.Optional("zmywarka"): vol.Any(None, str)},
    vol.Optional("variants"): {vol.Optional("pralka"): vol.In(["typical", "mean", "maximum"]), vol.Optional("zmywarka"): vol.In(["typical", "mean", "maximum"])},
    vol.Optional("goal"): vol.In(["pv", "cost"]),
    vol.Optional("range"): vol.In(["today", "tomorrow", "both", "custom"]),
    vol.Optional("earliest"): str,
    vol.Optional("latest"): str,
    vol.Optional("proposal_id"): str,
    vol.Optional("preview_id"): str,
})
@websocket_api.async_response
async def ws_schedule(hass, connection, msg):
    coordinator = hass.data.get(DOMAIN, {}).get(msg["entry_id"])
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "Nie znaleziono integracji PV Lab.")
        return
    request = None if msg["action"] == "status" else {key: value for key, value in msg.items() if key not in ("type", "id", "entry_id")}
    try:
        executor = getattr(coordinator, "executor", None)
        if executor and (msg["action"] == "cancel" or msg["action"] == "auto" and msg.get("enabled") is False):
            await executor.async_cancel()
        result = await device_schedule(async_get_clientsession(hass), coordinator.entry.data[CONF_URL], coordinator.entry.data[CONF_TOKEN], request)
        if executor:
            await executor.async_accept(result)
            result = executor.present(result)
        if request is not None:
            coordinator.data = {**(coordinator.data or {}), "devicePlanning": result}
            coordinator.async_update_listeners()
        connection.send_result(msg["id"], result)
    except (AuthenticationError, ClientError, TimeoutError, ValueError, HomeAssistantError) as err:
        if executor and (msg["action"] == "cancel" or msg["action"] == "auto" and msg.get("enabled") is False):
            local = executor.present((getattr(coordinator, "data", None) or {}).get("devicePlanning", {}))
            local.update(approved=False, phase="anulowany", cancelReason="Anulowano w HA; aplikacja chwilowo niedostępna.")
            connection.send_result(msg["id"], local)
        else:
            connection.send_error(msg["id"], "pv_lab_error", str(err) or "Nie można połączyć się z aplikacją PV Lab.")
