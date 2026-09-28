import random
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_aggregation,
    build_builder_query,
    build_function,
    build_group_by_field,
    build_order_by,
    build_scalar_query,
    make_query_request,
    series_points_by_label,
)

STEP = 60
MINUTE = timedelta(minutes=1)
SERVICES = ["svc-a", "svc-b", "svc-c", "svc-d"]
DATASET_MINUTES = 150


def test_random_request_sequences_match_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_metrics: Callable[[list[Metrics]], None],
    pytestconfig: pytest.Config,
) -> None:
    """
    Setup:
    Four services with random per-minute log counts and a gauge sample per
    minute over the last 150 minutes, all older than the flux interval.

    Tests:
    Random sessions, each with one query shape (logs count with or without a
    limit or a timeShift, a metrics avg with or without runningDiff, or a
    PromQL sum) and a random sequence of windows that slide, grow, shrink,
    nest or repeat, with ends on and off the step grid. Every request is sent
    through the cache and with noCache, and the two answers must agree. The
    failure message groups the differences by shape, window relation and
    symptom. Reproduce a run with --cache-fuzz-seed.
    """
    seed = pytestconfig.getoption("--cache-fuzz-seed")
    rng = random.Random(seed)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    dataset_end = now - 10 * MINUTE
    dataset_start = dataset_end - DATASET_MINUTES * MINUTE
    run = uuid4().hex[:8]

    counts = {service: [rng.randint(0, 5) if rng.random() < 0.8 else 0 for _ in range(DATASET_MINUTES)] for service in SERVICES}
    insert_logs(
        [
            Logs(
                timestamp=dataset_start + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": service},
                attributes={"run": run},
                body=f"{service} {minute} {i}",
            )
            for service in SERVICES
            for minute in range(DATASET_MINUTES)
            for i in range(counts[service][minute])
        ]
    )
    metric = f"cache_fuzz_gauge_{run}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"service": service},
                timestamp=dataset_start + minute * MINUTE,
                value=float(100 + 10 * SERVICES.index(service) + rng.randint(0, 50)),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for service in SERVICES[:2]
            for minute in range(DATASET_MINUTES)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    shapes = []
    for session in range(12):
        kind = session % 6
        session_token = f"{run}-{session}"
        if kind == 4:
            shapes.append(("promql", f"sum by (service) ({metric}) + {session}", "service", None))
        elif kind == 5:
            shapes.append(("metrics/avg runningDiff", build_builder_query("A", metric, "avg", "avg", group_by=["service"], functions=[build_function("runningDiff")], filter_expression=f"service != 'none-{session_token}'"), "service", None))
        else:
            limit = 2 if kind == 1 else None
            functions = [build_function("timeShift", 3600)] if kind == 2 else None
            label = "logs/count" + (" limit=2" if limit else "") + (" timeShift=3600" if functions else "")
            shapes.append(
                (
                    label,
                    build_scalar_query(
                        name="A",
                        signal="logs",
                        aggregations=[build_aggregation("count()")],
                        group_by=[build_group_by_field("service.name", "string", "resource")],
                        order=[build_order_by("count()", "desc")] if limit else None,
                        limit=limit,
                        filter_expression=f"run = '{run}' AND run != 'none-{session_token}'",
                        step_interval=STEP,
                        functions=functions,
                    ),
                    "service.name",
                    None,
                )
            )

    mismatches = []
    requests = 0
    for label, shape, series_label, _ in shapes:
        query = {"type": "promql", "spec": {"name": "A", "query": shape, "step": STEP}} if label == "promql" else shape
        history = []
        for _ in range(4):
            length = rng.choice([30, 3 * 60, 17 * 60, 60 * 60])
            if history and rng.random() < 0.66:
                start = history[-1][0] + rng.randint(-15, 15) * 60
                if rng.random() < 0.5:
                    length = history[-1][1] - history[-1][0]
            else:
                start = int(dataset_start.timestamp()) + rng.randint(65, DATASET_MINUTES - 10) * 60
            start = max(start, int(dataset_start.timestamp()) + 61 * 60)
            if rng.random() < 0.5:
                start += rng.randint(0, 59)
            end = start + length + (rng.randint(0, 59) if rng.random() < 0.5 else 0)
            end = min(end, int(dataset_end.timestamp()))
            if end <= start:
                end = start + STEP

            cached = make_query_request(signoz, token, start * 1000, end * 1000, [query], no_cache=False)
            assert cached.status_code == HTTPStatus.OK, cached.text
            fresh = make_query_request(signoz, token, start * 1000, end * 1000, [query], no_cache=True)
            assert fresh.status_code == HTTPStatus.OK, fresh.text
            requests += 1

            got = {name: points for name, points in series_points_by_label(cached.json(), "A", series_label).items()}
            want = {name: points for name, points in series_points_by_label(fresh.json(), "A", series_label).items()}
            symptoms = set()
            details = []
            if set(got) != set(want):
                symptoms.add("series-set")
                details.append(f"series got={sorted(got)} expected={sorted(want)}")
            for name in sorted(set(got) & set(want)):
                missing = set(want[name]) - set(got[name])
                extra = set(got[name]) - set(want[name])
                changed = [ts for ts in set(got[name]) & set(want[name]) if abs(got[name][ts] - want[name][ts]) > 1e-9]
                if missing:
                    symptoms.add("points-missing")
                    details.append(f"{name}: {len(missing)} of {len(want[name])} missing")
                if extra:
                    symptoms.add("points-extra")
                    details.append(f"{name}: {len(extra)} extra")
                if changed:
                    symptoms.add("value-differs")
                    details.append(f"{name}: {len(changed)} values differ")

            relation = "first"
            for prev_start, prev_end in history:
                if (start, end) == (prev_start, prev_end):
                    relation = "repeat"
                elif prev_start <= start and end <= prev_end:
                    relation = "inside-cached"
                elif start <= prev_start and prev_end <= end:
                    relation = "covers-cached"
                elif start < prev_end and end > prev_start:
                    relation = "overlaps-cached"
                else:
                    continue
                break
            else:
                relation = "disjoint" if history else "first"
            geometry = ",".join(part for part, present in (("start-unaligned", start % STEP != 0), ("end-unaligned", end % STEP != 0), ("sub-step", end - start < STEP), (relation, True)) if present)
            if symptoms:
                mismatches.append((label, geometry, "+".join(sorted(symptoms)), f"{datetime.fromtimestamp(start, tz=UTC):%H:%M:%S}-{datetime.fromtimestamp(end, tz=UTC):%H:%M:%S}", "; ".join(details)))
            history.append((start, end))

    classes: dict[tuple[str, str, str], list] = {}
    for label, geometry, symptom, window, detail in mismatches:
        classes.setdefault((label, geometry, symptom), []).append((window, detail))
    report = "\n".join(f"  {len(items):3d}  [{label}] {geometry} -> {symptom}   e.g. {items[0][0]}: {items[0][1]}" for (label, geometry, symptom), items in sorted(classes.items(), key=lambda kv: -len(kv[1])))
    assert not mismatches, f"{len(mismatches)} of {requests} random requests differ from the uncached answer (seed {seed}), {len(classes)} classes:\n{report}"
