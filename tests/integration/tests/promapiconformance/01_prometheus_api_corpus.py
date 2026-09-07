import json
import math
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.promqltestcorpus import ingest_promqltest_corpus

# The same frozen corpus the promqlconformance package replays through
# /api/v5/query_range, here replayed against the /prometheus/api/v1 endpoints
# with clickhousev2 as the serving provider (see conftest.py) — the two paths
# nothing else exercises. Range cases go to query_range, where a
# RangeExecutor provider serves transpiled statements when the shape allows.
# Instant cases go to /query with a real `time` parameter, so they need no
# grid encoding.
#
# Prometheus API sample values are strings, "NaN"/"+Inf"/"-Inf" included.
SPECIALS = {"NaN": math.nan, "Inf": math.inf, "+Inf": math.inf, "-Inf": -math.inf}
QUERY_TIMEOUT = 30


def test_prometheus_api_corpus(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    corpus, bases = ingest_promqltest_corpus(insert_metrics)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: list[str] = []
    for case in corpus["cases"]:
        # instant-coarse variants encode an instant eval as a coarse-step
        # range because the v5 API cannot run true instants. This API can:
        # the [base] form of the same eval goes through /query below, and the
        # transpiled coarse-step serving the encoding exercises is covered
        # (and its known divergences ledgered) by promqlconformance's
        # clickhousev2 leg.
        if case["variant"] == "instant-coarse":
            continue

        base = bases[case["dataset"]]
        start_ms = base + case["start_ms"]
        end_ms = base + case["end_ms"]
        step_s = max(1, case["step_ms"] // 1000)
        case_id = f"{case['source']}[{case['variant']}]"

        if case["instant"]:
            path, params = "/prometheus/api/v1/query", {"query": case["expr"], "time": end_ms / 1000}
        else:
            path, params = (
                "/prometheus/api/v1/query_range",
                {
                    "query": case["expr"],
                    "start": start_ms / 1000,
                    "end": end_ms / 1000,
                    "step": step_s,
                },
            )
        response = requests.get(
            signoz.self.host_configs["8080"].get(path),
            params=params,
            timeout=QUERY_TIMEOUT,
            headers={"authorization": f"Bearer {token}"},
        )
        if response.status_code != HTTPStatus.OK:
            failures.append(f"{case_id}: HTTP {response.status_code} for {case['expr']!r}: {response.text[:200]}")
            continue
        body = response.json()
        if body.get("status") != "success":
            failures.append(f"{case_id}: status {body.get('status')!r} for {case['expr']!r}: {json.dumps(body)[:200]}")
            continue

        result_type, result = body["data"]["resultType"], body["data"]["result"]
        actual: dict[tuple, dict[int, float]] = {}
        if result_type == "matrix":
            for series in result:
                points = {round(float(ts) * 1000): SPECIALS[v] if v in SPECIALS else float(v) for ts, v in series.get("values") or []}
                actual[tuple(sorted((series.get("metric") or {}).items()))] = points
        elif result_type == "vector":
            for series in result:
                ts, v = series["value"]
                actual[tuple(sorted((series.get("metric") or {}).items()))] = {round(float(ts) * 1000): SPECIALS[v] if v in SPECIALS else float(v)}
        elif result_type == "scalar":
            ts, v = result
            actual[()] = {round(float(ts) * 1000): SPECIALS[v] if v in SPECIALS else float(v)}

        expected: dict[tuple, dict[int, float]] = {}
        for res in case["expected"]:
            points = {base + off_ms: SPECIALS[v] if isinstance(v, str) else float(v) for off_ms, v in res["points"]}
            expected[tuple(sorted(res["labels"].items()))] = points

        if set(actual) != set(expected):
            missing = set(expected) - set(actual)
            extra = set(actual) - set(expected)
            failures.append(f"{case_id}: series mismatch for {case['expr']!r} (missing={sorted(missing)[:3]} extra={sorted(extra)[:3]})")
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
                    # Expected values carry the v5 API's rounding (>=1: three
                    # decimal places; <1: three significant digits); this API
                    # returns raw floats. One rounding quantum covers the
                    # largest possible rounding difference.
                    scale = max(abs(act_v), abs(exp_v))
                    if scale >= 1:
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
    assert not failures, f"{len(failures)} corpus cases diverged:\n" + "\n".join(failures[:25])
