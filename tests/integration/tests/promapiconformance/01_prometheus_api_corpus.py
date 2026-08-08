"""
Replay the frozen promqltest corpus against the /prometheus/api/v1
endpoints, with clickhousev2 as the serving provider (see conftest.py).

The oracle is the same committed corpus the promqlconformance package
replays through /api/v5/query_range. This package differs in two ways.
Range cases go to /prometheus/api/v1/query_range, where a RangeExecutor
provider serves transpiled statements when the shape allows. Instant cases
go to /prometheus/api/v1/query with a real `time` parameter, so they need
no grid encoding.
"""

import json
from collections.abc import Callable
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.promapi import prom_api_get, series_from_prom_result
from fixtures.promqltestcorpus import decode_corpus_value, labelset, ledger, values_close


def test_prometheus_api_corpus(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ingest_promqltest_corpus: Callable[[], tuple[dict, dict[int, int]]],
) -> None:
    corpus, bases = ingest_promqltest_corpus()
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: list[str] = []
    for case in corpus["cases"]:
        base = bases[case["dataset"]]
        start_ms = base + case["start_ms"]
        end_ms = base + case["end_ms"]
        step_s = max(1, case["step_ms"] // 1000)
        case_id = f"{case['source']}[{case['variant']}]"

        if case["instant"]:
            response = prom_api_get(signoz, token, "/prometheus/api/v1/query", {"query": case["expr"], "time": end_ms / 1000})
        else:
            response = prom_api_get(
                signoz,
                token,
                "/prometheus/api/v1/query_range",
                {"query": case["expr"], "start": start_ms / 1000, "end": end_ms / 1000, "step": step_s},
            )
        if response.status_code != HTTPStatus.OK:
            failures.append(f"{case_id}: HTTP {response.status_code} for {case['expr']!r}: {response.text[:200]}")
            continue
        body = response.json()
        if body.get("status") != "success":
            failures.append(f"{case_id}: status {body.get('status')!r} for {case['expr']!r}: {json.dumps(body)[:200]}")
            continue

        actual = series_from_prom_result(body["data"]["resultType"], body["data"]["result"])
        expected = {
            labelset(res["labels"]): {base + off_ms: decode_corpus_value(v) for off_ms, v in res["points"]}
            for res in case["expected"]
        }

        if set(actual) != set(expected):
            missing = set(expected) - set(actual)
            extra = set(actual) - set(expected)
            failures.append(f"{case_id}: series mismatch for {case['expr']!r} (missing={sorted(missing)[:3]} extra={sorted(extra)[:3]})")
            continue
        for lset, exp_points in expected.items():
            act_points = actual[lset]
            if set(act_points) != set(exp_points):
                failures.append(f"{case_id}: timestamp mismatch for {case['expr']!r} series {dict(lset)} (expected {len(exp_points)} points, got {len(act_points)})")
                break
            for ts, exp_v in exp_points.items():
                if not values_close(act_points[ts], exp_v):
                    failures.append(f"{case_id}: value mismatch for {case['expr']!r} series {dict(lset)} at {ts}: expected {exp_v}, got {act_points[ts]}")
                    break
            else:
                continue
            break

    for f_line in failures:
        print("DIVERGED", f_line)

    known = ledger("known_divergences_promapi.json")
    failed_ids = {f_line.split(": ", 1)[0] for f_line in failures}
    unexpected = [f_line for f_line in failures if f_line.split(": ", 1)[0] not in known]
    now_passing = sorted(set(known) - failed_ids)

    assert not unexpected, f"{len(unexpected)} corpus cases diverged beyond the known set:\n" + "\n".join(unexpected[:25])
    assert not now_passing, f"{len(now_passing)} known divergences now pass — remove them from known_divergences_promapi.json: {now_passing[:25]}"
