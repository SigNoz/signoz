"""PromQL provider parity: the CI guard for the clickhousev2 rollout.

Every battery query is fetched through /api/v5/query_range twice — once
served from the default provider, once pinned to the clickhousev2 provider
via the flag-gated X-SigNoz-PromQL-Provider header — over several evaluation
grids, and the two responses are compared series-by-series, point-by-point,
in the test. The providers read the same data through different
implementations, so timestamps and label sets must match exactly; values
within 1e-9 relative (they accumulate floats in different orders in the last
bit).

The fixtures are deterministic and target the semantics that historically
diverge between implementations:

- parity.counter: job=a resets mid-window; job=b is clean; job=c resets
  twice AND has a gap longer than the 5m lookback, so its series vanishes
  from instant selections and re-enters extrapolation windows.
- parity.gauge: pod=p1 lives forever; pod=p2 emits one stale marker and
  resumes (a scrape blip); pod=p3 dies with a stale marker and stays dead;
  pod=p4 is born mid-window; pod=p5 dies and resurrects 10 minutes later.
  Per-pod magnitudes are distinct so topk never sees ties (tied topk picks
  winners by evaluation order — legitimately different between two correct
  implementations).
- parity.hist.bucket: a classic cumulative histogram.

All values are powers of two so float aggregation is order-independent.

The evaluation grids vary the query window and step: aligned and unaligned
starts (grid anchoring), a step that is no multiple of the scrape cadence,
a coarse step, and a window that begins before any data exists.
"""

import math
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

REL_TOL = 1e-9

QUERIES = [
    # instant selectors: lookback, stale-marker shadowing, name keeping
    '{"parity.gauge"}',
    '{"parity.gauge"} > 4',
    'sum by (pod) ({"parity.gauge"})',
    'sum({"parity.gauge"} offset 10m)',
    # instant selection over a counter with a lookback-sized gap
    '{"parity.counter", job="c"}',
    # range functions: counter resets, double resets, gaps, extrapolation
    'sum by (job) (rate({"parity.counter"}[5m]))',
    'rate({"parity.counter", job="c"}[5m])',
    'increase({"parity.counter", job="c"}[15m])',
    'sum(increase({"parity.counter"}[10m] offset 15m))',
    'sum by (pod) (delta({"parity.gauge"}[15m]))',
    'irate({"parity.counter"}[5m])',
    'idelta({"parity.gauge"}[5m])',
    # *_over_time
    'max by (pod) (avg_over_time({"parity.gauge"}[10m]))',
    'count_over_time({"parity.gauge"}[10m])',
    'last_over_time({"parity.gauge"}[10m])',
    'min_over_time({"parity.gauge"}[7m])',
    'sum_over_time({"parity.counter", job="c"}[10m])',
    # hybrid shapes: quantiles, ratios, topk, or-fill
    'histogram_quantile(0.9, sum by (le) (rate({"parity.hist.bucket"}[5m])))',
    'sum(rate({"parity.counter"}[5m])) / sum(rate({"parity.counter"}[10m]))',
    'topk(2, sum by (pod) ({"parity.gauge"}))',
    'sum(rate({"parity.counter", job="missing"}[5m])) or vector(0)',
    # subquery smoothing evaluates inner units on the subquery grid
    'min_over_time((sum by (job) (increase({"parity.counter"}[5m])))[10m:5m])',
    'avg_over_time((sum by (pod) ({"parity.gauge"}))[10m:2m])',
]


def grids(now_ms: int) -> list[tuple[str, int, int, int]]:
    """(description, start_ms, end_ms, step_seconds) variations. Different
    starts anchor the evaluation grid differently; PromQL evaluates at
    start + k*step, so an unaligned start shifts which samples each lookback
    window sees. The long windows select the coarser series tables
    (time_series_v4_6hrs at > 6h, _1week at > 1w) so the table choice and
    its bucket rounding are exercised end to end, not just in unit tests."""
    minute = 60_000
    return [
        ("90m window, 60s step, minute-aligned", now_ms - 90 * minute, now_ms, 60),
        ("90m window, 60s step, start unaligned by 17s", now_ms - 90 * minute + 17_000, now_ms, 60),
        ("90m window, 90s step (no cadence multiple)", now_ms - 90 * minute, now_ms, 90),
        ("3h window starting before any data, 300s step", now_ms - 180 * minute, now_ms, 300),
        ("7h window (6h series table), 300s step", now_ms - 420 * minute, now_ms, 300),
        ("8d window (1w series table), 3600s step", now_ms - 8 * 24 * 60 * minute, now_ms, 3600),
    ]


def seed(insert_metrics, now: datetime) -> None:
    """95 minutes of 30s-cadence series ending at now (see module docstring
    for the shapes). Values are powers of two so float aggregation is
    order-independent."""
    metrics: list[Metrics] = []
    start = now - timedelta(minutes=95)

    counters = {"a": 0.0, "b": 0.0, "c": 0.0}
    step = 0
    ts = start
    while ts <= now:
        for i, job in enumerate(("a", "b", "c")):
            counters[job] += 2 << i
            if job == "a" and ts == start + timedelta(minutes=45):
                counters[job] = 8  # counter reset
            if job == "c":
                # Two resets and a >5m gap: the gap exceeds the lookback, so
                # the series vanishes from instant selections mid-window.
                if ts == start + timedelta(minutes=30) or ts == start + timedelta(minutes=70):
                    counters[job] = 4
                if start + timedelta(minutes=50) < ts <= start + timedelta(minutes=56):
                    continue
            metrics.append(
                Metrics(
                    metric_name="parity.counter",
                    labels={"job": job},
                    timestamp=ts,
                    value=counters[job],
                    temporality="Cumulative",
                    type_="Sum",
                )
            )

        # Distinct per-pod magnitudes keep topk free of ties: tied series
        # would make the winner storage-order-dependent and the comparison
        # nondeterministic.
        for pod, scale in (("p1", 1), ("p2", 8), ("p3", 64), ("p4", 128), ("p5", 256)):
            flags = 0
            value = float((1 << (step % 6)) * scale)
            if pod == "p2" and ts == start + timedelta(minutes=40):
                flags, value = 1, 0.0  # stale marker, series resumes after
            if pod == "p3":
                if ts > start + timedelta(minutes=50, seconds=30):
                    continue
                if ts == start + timedelta(minutes=50, seconds=30):
                    flags, value = 1, 0.0  # series dies and stays dead
            if pod == "p4" and ts < start + timedelta(minutes=60):
                continue  # born mid-window
            if pod == "p5":
                # Dies with a stale marker, resurrects 10 minutes later.
                if ts == start + timedelta(minutes=20):
                    flags, value = 1, 0.0
                elif start + timedelta(minutes=20) < ts < start + timedelta(minutes=30):
                    continue
            metrics.append(
                Metrics(
                    metric_name="parity.gauge",
                    labels={"pod": pod},
                    timestamp=ts,
                    value=value,
                    temporality="Unspecified",
                    type_="Gauge",
                    is_monotonic=False,
                    flags=flags,
                )
            )

        for i, le in enumerate(("0.5", "2", "+Inf")):
            metrics.append(
                Metrics(
                    metric_name="parity.hist.bucket",
                    labels={"le": le},
                    timestamp=ts,
                    value=float((step + 1) * (2 << i)),
                    temporality="Cumulative",
                    type_="Histogram",
                )
            )

        step += 1
        ts += timedelta(seconds=30)

    insert_metrics(metrics)


def normalize(response_json: dict) -> dict[tuple, list[tuple]]:
    """Response results as {sorted-label-pairs: [(ts, value), ...]}."""
    out: dict[tuple, list[tuple]] = {}
    for result in response_json["data"]["data"]["results"]:
        for aggregation in result.get("aggregations") or []:
            for series in aggregation.get("series") or []:
                key = tuple(
                    sorted((label["key"]["name"], label["value"]) for label in (series.get("labels") or []))
                )
                out[key] = [(v["timestamp"], v["value"]) for v in (series.get("values") or [])]
    return out


def values_equal(a: float, b: float) -> bool:
    if isinstance(a, str) or isinstance(b, str):  # "NaN" and friends
        return str(a) == str(b)
    if math.isnan(a) and math.isnan(b):
        return True
    return math.isclose(a, b, rel_tol=REL_TOL, abs_tol=1e-12)


def fetch(signoz: types.SigNoz, token: str, query: str, start_ms: int, end_ms: int, step: int, provider: str | None):
    payload = {
        "schemaVersion": "v1",
        "start": start_ms,
        "end": end_ms,
        "requestType": "time_series",
        "compositeQuery": {"queries": [{"type": "promql", "spec": {"name": "A", "query": query, "step": step}}]},
        "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        "noCache": True,
    }
    headers = {"authorization": f"Bearer {token}"}
    if provider:
        headers["X-SigNoz-PromQL-Provider"] = provider
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=60,
        headers=headers,
        json=payload,
    )
    assert response.status_code == HTTPStatus.OK, f"{query} (provider={provider}): {response.text}"
    return normalize(response.json())


def test_provider_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    seed(insert_metrics, now)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    now_ms = int(now.timestamp() * 1000)

    served_any_data = False
    for grid_desc, start_ms, end_ms, step in grids(now_ms):
        for query in QUERIES:
            where = f"{query} [{grid_desc}]"
            served = fetch(signoz, token, query, start_ms, end_ms, step, provider=None)
            pinned = fetch(signoz, token, query, start_ms, end_ms, step, provider="clickhousev2")

            assert served.keys() == pinned.keys(), (
                f"{where}: series sets differ\nonly default: {sorted(set(served) - set(pinned))}"
                f"\nonly clickhousev2: {sorted(set(pinned) - set(served))}"
            )
            for key, served_points in served.items():
                pinned_points = pinned[key]
                assert len(served_points) == len(pinned_points), f"{where} {key}: point counts differ ({len(served_points)} vs {len(pinned_points)})"
                for (ts_a, val_a), (ts_b, val_b) in zip(served_points, pinned_points):
                    assert ts_a == ts_b, f"{where} {key}: timestamps differ ({ts_a} vs {ts_b})"
                    assert values_equal(val_a, val_b), f"{where} {key} @{ts_a}: values differ ({val_a} vs {val_b})"
            if served:
                served_any_data = True

    assert served_any_data, "fixtures produced no data; the comparison would be over empties"
