"""Read-only connection to the local PV Lab app."""
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
