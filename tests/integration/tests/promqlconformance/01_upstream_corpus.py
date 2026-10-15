import json
import math
import os
from collections.abc import Callable
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.promqltestcorpus import ingest_promqltest_corpus
from fixtures.querier import get_all_series, make_query_request

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
# The corpus (see fixtures/promqltestcorpus.py) is frozen from Prometheus' own
# promql/promqltest testdata by scripts/promqltestcorpus (upstream load scripts
# + the vendored reference engine). Unlike live-vs-live parity suites, the
# oracle is a committed file, so the suite keeps working when the serving path
# itself is the thing being changed — the one situation where comparing two
# live paths against each other is blind.

# The ledger is enforced exactly in both directions: a new divergence is a
# regression, and a known divergence that starts passing must be removed. Its
# entries are the frozen defects of the serving path (the non-finite API
# filtering, and the clickhousev2 Kahan-summation class).
LEDGER_FILE = os.path.join(TESTDATA_DIR, "promqltestcorpus", "known_divergences.json")

SPECIALS = {"NaN": math.nan, "Inf": math.inf, "-Inf": -math.inf}


def test_upstream_promqltest_corpus(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    corpus, bases = ingest_promqltest_corpus(insert_metrics)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: list[str] = []
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

        response = make_query_request(signoz, token, req_start_ms, end_ms, [query])
        if response.status_code != HTTPStatus.OK:
            failures.append(f"{case_id}: HTTP {response.status_code} for {case['expr']!r}: {response.text[:200]}")
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
            failures.append(f"{case_id}: response carries multiple series with identical labels for {case['expr']!r}: {[dict(d) for d in duplicates[:3]]}")
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
            failures.append(f"{case_id}: series mismatch for {case['expr']!r} (missing={sorted(missing)[:3]} extra={sorted(extra)[:3]}) actual={[(dict(k), {t - base: v for t, v in pts.items()}) for k, pts in actual.items()]}")
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
            failures.append(mismatch)

    for f_line in failures:
        print("DIVERGED", f_line)

    known: dict[str, str] = {}
    if os.path.exists(LEDGER_FILE):
        with open(LEDGER_FILE, encoding="utf-8") as f:
            known = json.load(f)["divergences"]

    failed_ids = {f_line.split(": ", 1)[0] for f_line in failures}
    unexpected = [f_line for f_line in failures if f_line.split(": ", 1)[0] not in known]
    now_passing = sorted(set(known) - failed_ids)

    problems: list[str] = []
    if unexpected:
        problems.append(f"{len(unexpected)} corpus cases diverged beyond the known set:\n" + "\n".join(unexpected[:25]))
    if now_passing:
        problems.append(f"{len(now_passing)} known divergences now pass — remove them from {os.path.basename(LEDGER_FILE)}: {now_passing[:25]}")

    assert not problems, "\n\n".join(problems)
