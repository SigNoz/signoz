from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import build_builder_query, get_series_values, make_query_request


# A delta, non-monotonic Sum queried without an explicit type must be treated as
# a Sum: the server resolves the type and the delta rate/increase values must be
# correct. Non-reduced delta values are temporality-driven, so this is a
# forward-looking guard against a future change routing the delta path by type
# (e.g. gauge -> avg/last).
@pytest.mark.parametrize(
    "time_aggregation, expected",
    [
        ("rate", 1.0),  # 60 per 60s bucket / 60s
        ("increase", 60.0),
    ],
)
def test_delta_nonmonotonic_sum_is_treated_as_sum(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    time_aggregation: str,
    expected: float,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=6)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_delta_nonmonotonic_sum_{time_aggregation}"

    metrics = [
        Metrics(
            metric_name=metric_name,
            labels={"service": "a"},
            timestamp=now - timedelta(minutes=minute),
            value=60.0,
            temporality="Delta",
            type_="Sum",
            is_monotonic=False,
        )
        for minute in range(1, 6)
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # No type and no temporality: the server resolves both from the seeded series.
    query = build_builder_query("A", metric_name, time_aggregation, "sum")

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK, response.text

    values = get_series_values(response.json(), "A")
    assert len(values) == 5, f"Expected 5 buckets, got {values}"
    for value in values:
        assert value["value"] == expected, f"Expected {expected}, got {value['value']}"
