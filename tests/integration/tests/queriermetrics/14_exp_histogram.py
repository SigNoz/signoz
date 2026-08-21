from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import ExpHistogramMetrics
from fixtures.querier import (
    build_builder_query,
    get_all_series,
    get_series_values,
    make_query_request,
)

# quantilesDD carries 0.01 relative accuracy and the log-spaced observations put
# neighbouring ranks ~1.25% apart, so a percentile can land a few percent off
PERCENTILE_TOLERANCE = 0.05


@pytest.mark.parametrize(
    "space_aggregation, frontend_first, frontend_last, backend_first, backend_last",
    [
        ("p50", 118, 153, 711, 921),
        ("p95", 1108, 1435, 6651, 8613),
        ("p99", 1352, 1751, 8113, 10507),
    ],
)
@pytest.mark.parametrize("time_aggregation", ["", "rate"])
def test_exp_histogram_percentile_delta_grouped(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_exp_histogram_metrics: Callable[[list[ExpHistogramMetrics]], None],
    time_aggregation: str,
    space_aggregation: str,
    frontend_first: float,
    frontend_last: float,
    backend_first: float,
    backend_last: float,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_exp_histogram_latency"

    insert_exp_histogram_metrics(
        [
            ExpHistogramMetrics(
                metric_name=metric_name,
                # log-spaced latencies with a long tail, drifting ~30% higher across
                # the hour so each point carries a distinct distribution
                observations=[round(base * 1.0125**rank * (1 + minute / 200)) for rank in range(400)],
                labels={"service.name": service},
                timestamp=now - timedelta(minutes=60 - minute),
                temporality="Delta",
            )
            for service, base in (("frontend", 10), ("backend", 60))
            for minute in range(60)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        space_aggregation,
        temporality="delta",
        group_by=["service.name"],
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK, response.text

    all_series = get_all_series(response.json(), "A")
    values_by_service = {series["labels"][0]["value"]: [point["value"] for point in sorted(series["values"], key=lambda point: point["timestamp"])] for series in all_series}
    assert set(values_by_service.keys()) == {"frontend", "backend"}, f"got series {set(values_by_service.keys())}"

    for service, first, last in (
        ("frontend", frontend_first, frontend_last),
        ("backend", backend_first, backend_last),
    ):
        values = values_by_service[service]
        assert len(values) >= 55, f"{service}: expected a point per minute, got {len(values)}"
        assert values[0] == pytest.approx(first, rel=PERCENTILE_TOLERANCE), f"{service} {space_aggregation} at the oldest point: got {values[0]}, want ~{first}"
        assert values[-1] == pytest.approx(last, rel=PERCENTILE_TOLERANCE), f"{service} {space_aggregation} at the newest point: got {values[-1]}, want ~{last}"
        # every observation drifts up minute over minute, so the sketch must too
        assert values == sorted(values), f"{service} {space_aggregation} is not non-decreasing: {values}"


def test_exp_histogram_percentile_delta_merges_across_series(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_exp_histogram_metrics: Callable[[list[ExpHistogramMetrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_exp_histogram_latency_merged"

    insert_exp_histogram_metrics(
        [
            ExpHistogramMetrics(
                metric_name=metric_name,
                observations=[round(base * 1.0125**rank * (1 + minute / 200)) for rank in range(400)],
                labels={"service.name": service},
                timestamp=now - timedelta(minutes=60 - minute),
                temporality="Delta",
            )
            for service, base in (("frontend", 10), ("backend", 60))
            for minute in range(60)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query("A", metric_name, "", "p95", temporality="delta")

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK, response.text

    # both services' sketches merge into one, so p95 sits well above the frontend's
    # own p95 (~1108) and below the backend's (~6651)
    values = [point["value"] for point in sorted(get_series_values(response.json(), "A"), key=lambda point: point["timestamp"])]
    assert len(values) >= 55, f"expected a point per minute, got {len(values)}"
    assert values[0] == pytest.approx(5188, rel=PERCENTILE_TOLERANCE), f"oldest point: got {values[0]}, want ~5188"
    assert values[-1] == pytest.approx(6718, rel=PERCENTILE_TOLERANCE), f"newest point: got {values[-1]}, want ~6718"
