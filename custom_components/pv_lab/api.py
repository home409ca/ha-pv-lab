"""Local forecast readout and restricted planner input updates."""
import asyncio
from aiohttp import ClientSession


class AuthenticationError(Exception):
    """The pairing key was rejected."""


async def fetch_payload(session: ClientSession, url: str, token: str) -> dict:
    async with asyncio.timeout(20):
        async with session.get(
            url.rstrip("/") + "/api/integration",
            headers={"Authorization": "Bearer " + token},
        ) as response:
            if response.status in (401, 403):
                raise AuthenticationError
            response.raise_for_status()
            payload = await response.json()
            if payload.get("schema") != 1 or not isinstance(payload.get("days"), list):
                raise ValueError("Unsupported PV Lab response")
            return payload


async def update_plan(session: ClientSession, url: str, token: str, patch: dict):
    """Only edit the planner input surface; never expose app configuration writes."""
    async with asyncio.timeout(20):
        async with session.post(url.rstrip("/") + "/api/plan", headers={"Authorization": "Bearer " + token}, json=patch) as response:
            if response.status in (401, 403):
                raise AuthenticationError
            data = await response.json()
            if response.status >= 400:
                from homeassistant.exceptions import HomeAssistantError
                raise HomeAssistantError(data.get("error", "Nie udało się zapisać planu"))
            return data
