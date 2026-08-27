import json
import math
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import get_all_series, make_query_request

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
# Frozen corpus extracted from Prometheus' own promql/promqltest testdata by
# scripts/promqltestcorpus (upstream load scripts + the vendored reference engine).
# Unlike live-vs-live parity suites, the oracle is this committed file, so the suite
# keeps working when the serving path itself is the thing being changed — the one
# situation where comparing two live paths against each other is blind.
CORPUS_FILE = os.path.join(TESTDATA_DIR, "promqltestcorpus", "corpus.json")

# One ledger per leg, enforced exactly in both directions. The default leg's
# ledger is empty and pinned there; the clickhousev2 ledger is the rollout
# scorecard — the provider swap is measured by burning it down to empty.
LEDGER_FILES = {
    "default": os.path.join(TESTDATA_DIR, "promqltestcorpus", "known_divergences.json"),
    "clickhousev2": os.path.join(TESTDATA_DIR, "promqltestcorpus", "known_divergences_v2.json"),
}

# Every case replays on both legs, each asserted against the same frozen
# expectations and its own ledger — deliberately never against each other: both
# legs can sit within one rounding quantum of the expected value yet differ from
# each other by up to two quanta when a true value straddles a rounding boundary,
# so a leg-vs-leg equality check would reintroduce exactly the boundary noise the
# quantum tolerance absorbs. A case failing on one leg while passing on the other
# already localizes the defect to that provider; the printed DIVERGED lines for
# both legs are the side-by-side triage view. The clickhousev2 header is
# flag-gated (see conftest.py).
LEGS: list[tuple[str, dict | None]] = [
    ("default", None),
    ("clickhousev2", {"X-SigNoz-PromQL-Provider": "clickhousev2"}),
]

# Datasets sit on disjoint time windows (2h gaps, far beyond the 5m lookback) so
# one bulk ingest serves every case without cross-talk.
ISOLATION_GAP_MS = 2 * 3600 * 1000
SPECIALS = {"NaN": math.nan, "Inf": math.inf, "-Inf": -math.inf}


def test_upstream_promqltest_corpus(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    with open(CORPUS_FILE, encoding="utf-8") as f:
        corpus = json.load(f)

    cases_by_dataset: dict[int, list[dict]] = {}
    for case in corpus["cases"]:
        cases_by_dataset.setdefault(case["dataset"], []).append(case)

    # Lay datasets end to end on the timeline, newest last, ending safely in
    # the past; spans are per-dataset so the whole corpus stays within days.
    spans = {}
    for ds in corpus["datasets"]:
        sample_max = max((s["samples"][-1][0] for s in ds["series"] if s["samples"]), default=0)
        case_max = max((c["end_ms"] for c in cases_by_dataset.get(ds["id"], [])), default=0)
        spans[ds["id"]] = max(sample_max, case_max) + corpus["meta"]["lookback_ms"]

    # Hour-aligned dataset bases: registration rows are hour-bucketed, so
    # behavior depends on where samples fall relative to hour boundaries —
    # the exact known-divergences enforcement needs that identical every run.
    hour_ms = 3_600_000
    advances = {ds["id"]: -(-(spans[ds["id"]] + ISOLATION_GAP_MS) // hour_ms) * hour_ms for ds in corpus["datasets"]}
    total = sum(advances.values())
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    cursor = (int((now - timedelta(hours=1)).timestamp() * 1000) - total) // hour_ms * hour_ms

    bases: dict[int, int] = {}
    metrics: list[Metrics] = []
    for ds in corpus["datasets"]:
        bases[ds["id"]] = cursor
        for series in ds["series"]:
            labels = dict(series["labels"])
            metric_name = labels.pop("__name__")
            for off_ms, raw in series["samples"]:
                stale = raw == "stale"
                metrics.append(
                    Metrics(
                        metric_name=metric_name,
                        labels=labels,
                        timestamp=datetime.fromtimestamp((cursor + off_ms) / 1000, tz=UTC),
                        value=0.0 if stale else (SPECIALS[raw] if isinstance(raw, str) else float(raw)),
                        flags=1 if stale else 0,
                    )
                )
        cursor += advances[ds["id"]]

    insert_metrics(metrics)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: dict[str, list[str]] = {leg: [] for leg, _ in LEGS}
    for case in corpus["cases"]:
        base = bases[case["dataset"]]
        start_ms = base + case["start_ms"]
        end_ms = base + case["end_ms"]
        step_s = max(1, case["step_ms"] // 1000)
        req_start_ms = start_ms
        if case["instant"]:
            # The API rejects start == end; ask for one extra step backward
            # and compare only at the instant timestamp. Nudging the start
            # earlier instead of the end later keeps every window that the
            # expected values were computed from untouched.
            req_start_ms = start_ms - step_s * 1000
        query = {
            "type": "promql",
            "spec": {"name": "A", "query": case["expr"], "step": step_s},
        }
        case_id = f"{case['source']}[{case['variant']}]"

        for leg, headers in LEGS:
            response = make_query_request(signoz, token, req_start_ms, end_ms, [query], headers=headers)
            if response.status_code != HTTPStatus.OK:
                failures[leg].append(f"{case_id}: HTTP {response.status_code} for {case['expr']!r}: {response.text[:200]}")
                continue

            # A response carrying several series with identical visible labels
            # is itself a defect signal (e.g. a hidden grouping label stripped
            # on the way out) and must not be silently collapsed into one entry.
            actual: dict[tuple, dict[int, float]] = {}
            duplicates: list[tuple] = []
            # Empty results serialize with null aggregations/series/values fields.
            for series in get_all_series(response.json(), "A") or []:
                lbls = {l["key"]["name"]: str(l["value"]) for l in series.get("labels") or []}
                points = {int(v["timestamp"]): SPECIALS[v["value"]] if isinstance(v["value"], str) else float(v["value"]) for v in series.get("values") or []}
                key = tuple(sorted(lbls.items()))
                if key in actual:
                    duplicates.append(key)
                actual[key] = points
            if duplicates:
                failures[leg].append(f"{case_id}: response carries multiple series with identical labels for {case['expr']!r}: {[dict(d) for d in duplicates[:3]]}")
                continue

            if case["instant"]:
                # Keep only the instant point; the extra grid step is a request
                # encoding byproduct, not part of the assertion.
                actual = {lset: {ts: v for ts, v in pts.items() if ts == end_ms} for lset, pts in actual.items()}
                actual = {lset: pts for lset, pts in actual.items() if pts}
            expected: dict[tuple, dict[int, float]] = {}
            for res in case["expected"]:
                points = {base + off_ms: SPECIALS[v] if isinstance(v, str) else float(v) for off_ms, v in res["points"]}
                expected[tuple(sorted(res["labels"].items()))] = points

            if set(actual) != set(expected):
                missing = set(expected) - set(actual)
                extra = set(actual) - set(expected)
                failures[leg].append(f"{case_id}: series mismatch for {case['expr']!r} (missing={sorted(missing)[:3]} extra={sorted(extra)[:3]}) actual={[(dict(k), {t - base: v for t, v in pts.items()}) for k, pts in actual.items()]}")
                continue

            mismatch = None
            for lset, exp_points in expected.items():
                act_points = actual[lset]
                if set(act_points) != set(exp_points):
                    mismatch = f"{case_id}: timestamp mismatch for {case['expr']!r} series {dict(lset)} (expected {len(exp_points)} points, got {len(act_points)})"
                    break
                for ts, exp_v in exp_points.items():
                    act_v = act_points[ts]
                    if math.isnan(act_v) or math.isnan(exp_v):
                        close = math.isnan(act_v) and math.isnan(exp_v)
                    elif math.isinf(act_v) or math.isinf(exp_v):
                        close = act_v == exp_v
                    elif act_v == exp_v:
                        close = True
                    else:
                        # Both sides carry the API's rounding (>=1: three decimal places; <1:
                        # three significant digits). A true value sitting exactly on a rounding
                        # boundary can round either way when the two computations differ at ULP
                        # level (float aggregation order over series is storage-iteration
                        # dependent), so allow one rounding quantum.
                        scale = max(abs(act_v), abs(exp_v))
                        if scale >= 1:
                            # Values too large to round pass through unrounded; give those an
                            # ULP-class relative grace on top of the rounding quantum.
                            quantum = max(1e-3, scale * 1e-9)
                        else:
                            quantum = 10 ** (math.floor(math.log10(scale)) - 2)
                        close = abs(act_v - exp_v) <= quantum + 1e-12
                    if not close:
                        mismatch = f"{case_id}: value mismatch for {case['expr']!r} series {dict(lset)} at {ts}: expected {exp_v}, got {act_v}"
                        break
                if mismatch:
                    break
            if mismatch:
                failures[leg].append(mismatch)

    for leg, _ in LEGS:
        for f_line in failures[leg]:
            print("DIVERGED", f"[{leg}]", f_line)

    # Known divergences are defects of that leg's serving path, frozen with
    # reasons. Each set is enforced exactly in both directions: a NEW
    # divergence is a regression, and a known divergence that starts passing
    # must be removed from the file. Problems across both legs are collected
    # before asserting so one leg's failure never hides the other's.
    problems: list[str] = []
    for leg, _ in LEGS:
        known: dict[str, str] = {}
        if os.path.exists(LEDGER_FILES[leg]):
            with open(LEDGER_FILES[leg], encoding="utf-8") as f:
                known = json.load(f)["divergences"]

        failed_ids = {f_line.split(": ", 1)[0] for f_line in failures[leg]}
        unexpected = [f_line for f_line in failures[leg] if f_line.split(": ", 1)[0] not in known]
        now_passing = sorted(set(known) - failed_ids)

        if unexpected:
            problems.append(f"[{leg}] {len(unexpected)} corpus cases diverged beyond the known set:\n" + "\n".join(unexpected[:25]))
        if now_passing:
            problems.append(f"[{leg}] {len(now_passing)} known divergences now pass — remove them from {os.path.basename(LEDGER_FILES[leg])}: {now_passing[:25]}")

    assert not problems, "\n\n".join(problems)
