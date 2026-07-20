"""
Regression tests for series identity in the PromQL serving path (PR #8563).

#8563 fixed a real duplicate-labelset collision by injecting a synthetic
per-series "fingerprint" label, which silently broke without() grouping and
unaggregated vector matching; the adapter now merges fingerprints sharing a
labelset instead. Pinned here:

  1. Clean data: without() yields exactly the grouped series with correct
     sums; "fingerprint" behaves as any absent label.
  2. The #8563 incident: one series under two fingerprints (empty-valued vs
     absent label). Both must come back as ONE merged series — not a
     "duplicate series" error, not duplicate identical-labeled output.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import get_all_series, make_query_request

METRIC = "probe_requests"
EVOLVED_METRIC = "probe_schema_evolution"


def _value_at(view_entry: tuple[dict, list], ts_ms: int) -> float:
    for ts, v in view_entry[1]:
        if ts == ts_ms:
            return float(v)
    raise AssertionError(f"no point at {ts_ms} in {view_entry}")


def test_identical_labelsets_merge_and_grouping(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    base = now - timedelta(minutes=30)

    # Scenario 1: four clean series, 2 groups x 2 instances, 3 samples each.
    labelsets = [
        {"group": "canary", "instance": "0"},
        {"group": "canary", "instance": "1"},
        {"group": "production", "instance": "0"},
        {"group": "production", "instance": "1"},
    ]
    metrics: list[Metrics] = []
    for i, lbls in enumerate(labelsets):
        for k in range(3):
            metrics.append(
                Metrics(
                    metric_name=METRIC,
                    labels=dict(lbls),
                    timestamp=base + timedelta(minutes=k),
                    value=float((i + 1) * 100 + k),
                )
            )

    # Scenario 2 (PR #8563): one conceptual series under two fingerprints.
    # The first three samples carry schema_url="" (empty value, dropped at
    # read time); the next three drop the label entirely (new fingerprint).
    for k in range(3):
        metrics.append(
            Metrics(
                metric_name=EVOLVED_METRIC,
                labels={"job": "api", "schema_url": ""},
                timestamp=base + timedelta(minutes=k),
                value=float(k + 1),
            )
        )
    for k in range(3, 6):
        metrics.append(
            Metrics(
                metric_name=EVOLVED_METRIC,
                labels={"job": "api"},
                timestamp=base + timedelta(minutes=k),
                value=float(k + 1),
            )
        )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def run(promql: str, start_ms: int, end_ms: int) -> list[tuple[dict, list]]:
        q = {"type": "promql", "spec": {"name": "A", "query": promql, "step": 60}}
        resp = make_query_request(signoz, token, start_ms, end_ms, [q])
        assert resp.status_code == HTTPStatus.OK, f"{promql!r}: {resp.text[:300]}"
        out = []
        for series in get_all_series(resp.json(), "A") or []:
            lbls = {l["key"]["name"]: str(l["value"]) for l in series.get("labels") or []}
            vals = [(v["timestamp"], v["value"]) for v in series.get("values") or []]
            out.append((lbls, vals))
        return sorted(out, key=lambda x: sorted(x[0].items()))

    end_ms = int((base + timedelta(minutes=2)).timestamp() * 1000)
    start_ms = end_ms - 60_000

    raw = run(METRIC, start_ms, end_ms)
    assert len(raw) == 4, f"raw selector must show the 4 ingested series: {raw}"
    assert len({tuple(sorted(l.items())) for l, _ in raw}) == 4
    assert not any("fingerprint" in l for l, _ in raw), "no synthetic fingerprint label may appear in results"

    count = run(f"count({METRIC})", start_ms, end_ms)
    assert count and _value_at(count[0], end_ms) == 4

    # without(instance): exactly one series per group, with the group sums —
    # not per-fingerprint groups collapsing into duplicate labelsets.
    without = run(f"sum without (instance) ({METRIC})", start_ms, end_ms)
    assert [(l.get("group"), _value_at((l, v), end_ms)) for l, v in without] == [
        ("canary", 304.0),
        ("production", 704.0),
    ], f"without(instance) must yield 2 correctly-summed groups: {without}"

    # "fingerprint" is now just an absent label: adding it to without() must
    # not change the result, and grouping by it collapses everything.
    healed = run(f"sum without (instance, fingerprint) ({METRIC})", start_ms, end_ms)
    assert [(l.get("group"), _value_at((l, v), end_ms)) for l, v in healed] == [
        ("canary", 304.0),
        ("production", 704.0),
    ], f"without(instance, fingerprint) must equal without(instance): {healed}"

    by_fp = run(f"sum by (fingerprint) ({METRIC})", start_ms, end_ms)
    assert len(by_fp) == 1 and _value_at(by_fp[0], end_ms) == 304.0 + 704.0, f"by(fingerprint) must collapse to one group (label absent): {by_fp}"
    assert "fingerprint" not in by_fp[0][0] or by_fp[0][0] == {}, by_fp

    # Scenario 2: both fingerprints must come back as ONE merged series
    # spanning the full range — no duplicate-series error, no duplicate
    # identical-labeled output.
    evo_start_ms = int(base.timestamp() * 1000)
    evo_end_ms = int((base + timedelta(minutes=5)).timestamp() * 1000)
    evolved = run(EVOLVED_METRIC, evo_start_ms, evo_end_ms)
    assert len(evolved) == 1, f"label-evolution fingerprints must merge into one series: {evolved}"
    lbls, _ = evolved[0]
    assert lbls == {"__name__": EVOLVED_METRIC, "job": "api"}, evolved
    got = [_value_at(evolved[0], evo_start_ms + m * 60_000) for m in range(6)]
    assert got == [1.0, 2.0, 3.0, 4.0, 5.0, 6.0], f"merged series must carry both fingerprints' samples in order: {got}"
