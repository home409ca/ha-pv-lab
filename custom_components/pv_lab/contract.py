"""Pure payload mapping, kept independent of Home Assistant for verification."""
from datetime import datetime, timezone


def sensor_specs():
    specs = []
    for offset in range(8):
        label = "dzisiaj" if offset == 0 else "jutro" if offset == 1 else f"za {offset} dni"
        specs.append({"key": f"forecast_d{offset}", "name": f"Prognoza {label}", "offset": offset, "kind": "energy"})
        for length in (1, 2, 3):
            for kind in ("window_energy", "window_start", "window_status"):
                specs.append({"key": f"best_{length}h_d{offset}_{kind}", "name": f"Najlepsze dostępne {length} h {label}" + (" energia" if kind == "window_energy" else " status" if kind == "window_status" else " początek"), "offset": offset, "length": length, "kind": kind, "enabled": offset < 2})
        if offset < 2:
            for kind, name in (("revision_time", "Ostatnia zmiana"), ("revision_delta", "Zmiana prognozy"), ("revision_direction", "Kierunek zmiany")):
                specs.append({"key": f"{kind}_d{offset}", "name": f"{name} {label}", "kind": kind, "offset": offset})
    specs.extend([
        {"key": "remaining_today", "name": "Pozostało dzisiaj", "kind": "remaining_today"},
        {"key": "remaining_hour", "name": "Pozostało w bieżącej godzinie", "kind": "remaining_hour"},
        {"key": "calculated_at", "name": "Ostatnie przeliczenie", "kind": "calculated_at"},
    ])
    specs.extend([
        {"key": "planner_start", "name": "Plan urządzenia początek", "kind": "planner_start"},
        {"key": "planner_end", "name": "Plan urządzenia koniec", "kind": "planner_end"},
        {"key": "planner_covered", "name": "Plan urządzenia pokrycie energii", "kind": "planner_covered"},
        {"key": "planner_percent", "name": "Plan urządzenia pokrycie procent", "kind": "planner_percent"},
        {"key": "planner_deficit", "name": "Plan urządzenia niedobór po bilansowaniu", "kind": "planner_deficit"},
        {"key": "planner_physical", "name": "Plan urządzenia dodatkowy pobór fizyczny", "kind": "planner_physical"},
        {"key": "planner_status", "name": "Plan urządzenia status", "kind": "planner_status"},
        {"key": "planner_calculated", "name": "Plan urządzenia ostatnie przeliczenie", "kind": "planner_calculated"},
        {"key": "balance_now", "name": "Bilans bieżącego okresu netto", "kind": "balance_now"},
        {"key": "balance_end", "name": "Bilans końca okresu prognoza", "kind": "balance_end"},
        {"key": "balance_after", "name": "Bilans końca okresu z urządzeniem", "kind": "balance_after"},
        {"key": "balance_source", "name": "Bilans źródło danych", "kind": "balance_source"},
    ])
    return specs


def read_sensor(payload, spec):
    day = next((d for d in payload.get("days", []) if d.get("offset") == spec.get("offset")), {})
    attrs = {"forecast_date": day.get("date"), "coverage_complete": day.get("complete"), "calculated_at": payload.get("calculatedAt")}
    kind = spec["kind"]
    if kind.startswith("planner_") or kind.startswith("balance_"):
        planner = payload.get("planner") or {}
        best = planner.get("best") or {}
        balance = planner.get("balance") or {}
        attrs.update({"mode": planner.get("settings", {}).get("mode"), "alternatives": planner.get("alternatives", []), "balance_source": balance.get("source"), "note": "Równomierny pobór; rezerwa domu; saldo dodatnie oznacza eksport netto, ujemne import netto"})
        mapping = {"planner_start": best.get("start"), "planner_end": best.get("end"), "planner_covered": best.get("coveredKWh"), "planner_percent": best.get("coveragePercent"), "planner_deficit": best.get("deficitKWh"), "planner_physical": best.get("physicalImportKWh"), "planner_status": planner.get("status"), "planner_calculated": planner.get("calculatedAt"), "balance_now": balance.get("netKWh"), "balance_end": balance.get("forecastNetKWh"), "balance_after": balance.get("afterDeviceKWh"), "balance_source": {"measured": "pomiar", "estimated": "oszacowanie"}.get(balance.get("source"))}
        return mapping.get(kind), attrs
    if kind == "energy":
        attrs["revision"] = day.get("revision")
        return day.get("kWh"), attrs
    if kind.startswith("window_"):
        key = {1: "oneHour", 2: "twoHours", 3: "threeHours"}[spec["length"]]
        window = day.get("windows", {}).get(key) or {}
        status = day.get("windowStatus", {}).get(key)
        attrs["status"] = status
        if kind == "window_status":
            return status, attrs
        if kind == "window_energy" and not window and status in ("produkcja na dziś zakończona", "brak pełnego okna przed końcem dnia"):
            return 0, attrs
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
