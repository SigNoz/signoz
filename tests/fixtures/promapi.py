"""Client helpers for the /prometheus/api/v1 endpoints."""

import math

import requests

from fixtures import types

SPECIALS = {"NaN": math.nan, "Inf": math.inf, "+Inf": math.inf, "-Inf": -math.inf}
QUERY_TIMEOUT = 30


def prom_api_get(signoz: types.SigNoz, token: str, path: str, params: dict) -> requests.Response:
    return requests.get(
        signoz.self.host_configs["8080"].get(path),
        params=params,
        timeout=QUERY_TIMEOUT,
        headers={"authorization": f"Bearer {token}"},
    )


def prom_api_value(v: str) -> float:
    """Prometheus API sample values are strings, including "NaN" and "+Inf"."""
    if v in SPECIALS:
        return SPECIALS[v]
    return float(v)


def series_from_prom_result(result_type: str, result) -> dict[tuple, dict[int, float]]:
    """Flattens a matrix/vector/scalar result into
    {sorted-labels tuple: {unix_ms: value}}."""
    out: dict[tuple, dict[int, float]] = {}
    if result_type == "matrix":
        for series in result:
            points = {round(float(ts) * 1000): prom_api_value(v) for ts, v in series.get("values") or []}
            out[tuple(sorted((series.get("metric") or {}).items()))] = points
    elif result_type == "vector":
        for series in result:
            ts, v = series["value"]
            out[tuple(sorted((series.get("metric") or {}).items()))] = {round(float(ts) * 1000): prom_api_value(v)}
    elif result_type == "scalar":
        ts, v = result
        out[()] = {round(float(ts) * 1000): prom_api_value(v)}
    return out
