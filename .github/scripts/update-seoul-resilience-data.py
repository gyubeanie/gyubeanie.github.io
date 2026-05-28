#!/usr/bin/env python3
"""Refresh public Seoul Open Data snapshots for the Seoul resilience MVP.

The GitHub Pages frontend is static, so this script is designed to run in
GitHub Actions with `SEOUL_OPEN_DATA_KEY` supplied as a repository secret.
It writes a redacted JSON snapshot that contains no API key.

The service names below are intentionally public, defensive, and resilience
oriented. If Seoul changes a service identifier, the script records that
service as unavailable instead of failing the whole workflow.
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SEOUL_API_BASE = "https://openapi.seoul.go.kr:8088"
OUTPUT_PATH = Path("seoul-resilience/data/seoul-live.json")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        text = str(value).strip().replace(",", "")
        if not text or text in {"-", "null", "None"}:
            return None
        return float(text)
    except (TypeError, ValueError):
        return None


def api_url(key: str, service: str, start: int = 1, end: int = 100, *extra: str) -> str:
    parts = [
        SEOUL_API_BASE,
        urllib.parse.quote(key, safe=""),
        "json",
        urllib.parse.quote(service, safe=""),
        str(start),
        str(end),
    ]
    parts.extend(urllib.parse.quote(str(item), safe="") for item in extra)
    return "/".join(parts)


def fetch_service(key: str, service: str, start: int = 1, end: int = 100, *extra: str) -> dict[str, Any]:
    url = api_url(key, service, start, end, *extra)
    started = time.time()
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8-sig"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {
            "ok": False,
            "service": service,
            "error": f"{type(exc).__name__}: {exc}",
            "rows": [],
            "elapsed_ms": round((time.time() - started) * 1000),
        }

    container = payload.get(service)
    if not isinstance(container, dict):
        return {
            "ok": False,
            "service": service,
            "error": payload.get("RESULT", {}).get("MESSAGE") or "Unexpected Seoul Open Data response",
            "rows": [],
            "raw_keys": sorted(payload.keys())[:8],
            "elapsed_ms": round((time.time() - started) * 1000),
        }

    result = container.get("RESULT", {})
    rows = container.get("row", [])
    if isinstance(rows, dict):
        rows = [rows]
    if not isinstance(rows, list):
        rows = []

    return {
        "ok": result.get("CODE") in {None, "INFO-000"} or bool(rows),
        "service": service,
        "result_code": result.get("CODE"),
        "message": result.get("MESSAGE"),
        "count": container.get("list_total_count", len(rows)),
        "rows": rows,
        "elapsed_ms": round((time.time() - started) * 1000),
    }


def summarize_rainfall(rows: list[dict[str, Any]]) -> dict[str, Any]:
    values: list[float] = []
    stations: set[str] = set()
    max_row: dict[str, Any] | None = None
    max_value = -1.0

    candidate_fields = [
        "RAINFALL10",
        "RAINFALL15",
        "RAINFALL1H",
        "RAINFALL",
        "RAIN",
        "RF",
    ]

    for row in rows:
        station = row.get("RAINGAUGE_NAME") or row.get("GAUGE_NAME") or row.get("STN_NM") or row.get("GUBUN")
        if station:
            stations.add(str(station))
        value = None
        for field in candidate_fields:
            value = to_float(row.get(field))
            if value is not None:
                break
        if value is not None:
            values.append(value)
            if value > max_value:
                max_value = value
                max_row = row

    return {
        "station_count": len(stations) or len(rows),
        "value_count": len(values),
        "max_mm": round(max(values), 2) if values else None,
        "mean_mm": round(statistics.fmean(values), 2) if values else None,
        "max_station": max_row.get("RAINGAUGE_NAME") or max_row.get("GAUGE_NAME") or max_row.get("STN_NM") if max_row else None,
    }


def summarize_river_stage(rows: list[dict[str, Any]]) -> dict[str, Any]:
    stations: set[str] = set()
    levels: list[float] = []
    ratios: list[float] = []
    max_ratio_row: dict[str, Any] | None = None
    max_ratio = -1.0

    for row in rows:
        station = row.get("GAUGE_NAME") or row.get("STN_NM") or row.get("OBSERVATORY_NAME")
        if station:
            stations.add(str(station))
        level = to_float(row.get("WATER_LEVEL") or row.get("WL") or row.get("WLVL"))
        bank = to_float(row.get("BANK_LEVEL") or row.get("PLANFLOOD_LEVEL") or row.get("WARNING_LEVEL"))
        if level is not None:
            levels.append(level)
        if level is not None and bank and bank > 0:
            ratio = level / bank
            ratios.append(ratio)
            if ratio > max_ratio:
                max_ratio = ratio
                max_ratio_row = row

    return {
        "station_count": len(stations) or len(rows),
        "level_count": len(levels),
        "max_level_m": round(max(levels), 3) if levels else None,
        "mean_level_m": round(statistics.fmean(levels), 3) if levels else None,
        "max_bank_ratio": round(max(ratios), 3) if ratios else None,
        "max_ratio_station": max_ratio_row.get("GAUGE_NAME") or max_ratio_row.get("STN_NM") if max_ratio_row else None,
    }


def compact_rows(rows: list[dict[str, Any]], keep: list[str], limit: int = 50) -> list[dict[str, Any]]:
    compacted: list[dict[str, Any]] = []
    for row in rows[:limit]:
        compacted.append({key: row.get(key) for key in keep if key in row})
    return compacted


def main() -> int:
    key = os.environ.get("SEOUL_OPEN_DATA_KEY", "").strip()
    if not key:
        print("SEOUL_OPEN_DATA_KEY is not configured; skipping snapshot generation.")
        return 0

    services = {
        # Seoul rainfall and river service identifiers are public OpenAPI
        # service names; failures are recorded so the dashboard can show
        # "자료 미수신" without breaking the site.
        "rainfall": fetch_service(key, "ListRainfallService", 1, 200),
        "river_stage": fetch_service(key, "ListRiverStageService", 1, 100),
    }

    rainfall_rows = services["rainfall"].get("rows", [])
    river_rows = services["river_stage"].get("rows", [])

    snapshot = {
        "generated_at": now_iso(),
        "schema_version": 1,
        "is_live": True,
        "source": {
            "provider": "서울 열린데이터광장",
            "access_pattern": "GitHub Actions scheduled static JSON snapshot",
            "key_redacted": True,
        },
        "services": {
            "rainfall": {
                **{k: v for k, v in services["rainfall"].items() if k != "rows"},
                "summary": summarize_rainfall(rainfall_rows),
                "rows": compact_rows(
                    rainfall_rows,
                    [
                        "RAINGAUGE_CODE",
                        "RAINGAUGE_NAME",
                        "GU_CODE",
                        "GU_NAME",
                        "RAINFALL10",
                        "RAINFALL15",
                        "RAINFALL1H",
                        "RAINFALL",
                        "RECEIVE_TIME",
                    ],
                ),
            },
            "river_stage": {
                **{k: v for k, v in services["river_stage"].items() if k != "rows"},
                "summary": summarize_river_stage(river_rows),
                "rows": compact_rows(
                    river_rows,
                    [
                        "GAUGE_CODE",
                        "GAUGE_NAME",
                        "RIVER_NAME",
                        "GU_NAME",
                        "WATER_LEVEL",
                        "BANK_LEVEL",
                        "WARNING_LEVEL",
                        "PLANFLOOD_LEVEL",
                        "OBS_TIME",
                        "RECEIVE_TIME",
                    ],
                ),
            },
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {OUTPUT_PATH}")
    for name, service in snapshot["services"].items():
        print(f"{name}: ok={service.get('ok')} count={service.get('count')} elapsed_ms={service.get('elapsed_ms')}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
