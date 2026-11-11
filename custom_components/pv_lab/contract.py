"""Pure payload mapping, kept independent of Home Assistant for verification."""
from datetime import datetime, timezone


def sensor_specs():
    specs = []
    for offset in range(8):
        label = "dzisiaj" if offset == 0 else "jutro" if offset == 1 else f"za {offset} dni"
        specs.append({"key": f"forecast_d{offset}", "name": f"Prognoza {label}", "offset": offset, "kind": "energy"})
        for length in (2, 3):
            for kind in ("window_energy", "window_start"):
                specs.append({"key": f"best_{length}h_d{offset}_{kind}", "name": f"Najlepsze dostępne {length} h {label}" + (" energia" if kind == "window_energy" else " początek"), "offset": offset, "length": length, "kind": kind, "enabled": offset < 2})
        if offset < 2:
            for kind, name in (("revision_time", "Ostatnia zmiana"), ("revision_delta", "Zmiana prognozy"), ("revision_direction", "Kierunek zmiany")):
                specs.append({"key": f"{kind}_d{offset}", "name": f"{name} {label}", "kind": kind, "offset": offset})
    specs.extend([
        {"key": "remaining_today", "name": "Pozostało dzisiaj", "kind": "remaining_today"},
        {"key": "remaining_hour", "name": "Pozostało w bieżącej godzinie", "kind": "remaining_hour"},
        {"key": "calculated_at", "name": "Ostatnie przeliczenie", "kind": "calculated_at"},
    ])
    return specs


def read_sensor(payload, spec):
    day = next((d for d in payload.get("days", []) if d.get("offset") == spec.get("offset")), {})
    attrs = {"forecast_date": day.get("date"), "coverage_complete": day.get("complete"), "calculated_at": payload.get("calculatedAt")}
    kind = spec["kind"]
    if kind == "energy":
        attrs["revision"] = day.get("revision")
        return day.get("kWh"), attrs
    if kind.startswith("window_"):
        window = day.get("windows", {}).get("twoHours" if spec["length"] == 2 else "threeHours") or {}
        for key in ("start", "end"):
            value = window.get(key)
            attrs[key] = datetime.fromtimestamp(value / 1000, timezone.utc).isoformat() if value is not None else None
        attrs.update({"energy_kwh": window.get("kWh"), "duration_hours": window.get("hours"), "average_power_w": window.get("averageW"), "note": "Production forecast; household consumption is not subtracted"})
        return (window.get("kWh") if kind == "window_energy" else window.get("start")), attrs
    revision = day.get("revision") or {}
    if kind == "revision_time":
        return revision.get("at"), attrs
    if kind == "revision_delta":
        attrs["previous_kwh"] = revision.get("previousKWh")
        return revision.get("deltaKWh"), attrs
    if kind == "revision_direction":
        return {"up": "wzrost", "down": "spadek", "initial": "pierwsza prognoza"}.get(revision.get("direction")), attrs
    if kind == "remaining_today":
        return payload.get("remainingTodayKWh"), attrs
    if kind == "remaining_hour":
        return payload.get("remainingHourKWh"), attrs
    if kind == "calculated_at":
        return payload.get("calculatedAt"), attrs
    return None, attrs


def hourly_forecast(payload):
    periods = {}
    for row in payload.get("periods", []):
        dt = datetime.fromisoformat(row["start"].replace("Z", "+00:00")).astimezone(timezone.utc)
        key = dt.replace(minute=0, second=0, microsecond=0).isoformat()
        bucket = periods.setdefault(key, {})
        bucket[dt.isoformat()] = row["wh"]
    return {key: sum(values.values()) for key, values in periods.items() if len(values) == 4}
