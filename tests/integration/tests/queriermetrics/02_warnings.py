from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_builder_query,
    get_all_warnings,
    make_query_request,
)

HISTOGRAM_FILE = get_testdata_file_path("histogram_data_1h.jsonl")


def test_histogram_p90_returns_warning_outside_data_window(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test_p90_last_seen_bucket"

    metrics = Metrics.load_from_file(
        HISTOGRAM_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        "p90",
    )

    end_ms = int(now.timestamp() * 1000)

    start_2h = int((now - timedelta(hours=2)).timestamp() * 1000)
    response = make_query_request(signoz, token, start_2h, end_ms, [query])
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    start_15m = int((now - timedelta(minutes=15)).timestamp() * 1000)
    response = make_query_request(signoz, token, start_15m, end_ms, [query])
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    warnings = get_all_warnings(data)
    assert len(warnings) == 1
    assert warnings[0]["message"].startswith(f"no data found for the metric {metric_name}")


def test_non_existent_metrics_returns_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "whatevergoennnsgoeshere"

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        "sum",
    )

    end_ms = int(now.timestamp() * 1000)

    start_2h = int((now - timedelta(hours=2)).timestamp() * 1000)
    response = make_query_request(signoz, token, start_2h, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    warnings = get_all_warnings(data)
    assert any("whatevergoennnsgoeshere" in w["message"] and "has never been received" in w["message"] for w in warnings), f"expected never-seen metric warning, got: {warnings}"


def test_non_existent_internal_metrics_returns_no_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "signoz_calls_total"

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        "sum",
    )

    end_ms = int(now.timestamp() * 1000)

    start_2h = int((now - timedelta(hours=2)).timestamp() * 1000)
    response = make_query_request(signoz, token, start_2h, end_ms, [query])
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert get_all_warnings(data) == []


def test_variable_in_filter_returns_no_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    A dashboard variable used in a metric filter expression (e.g.
    `my_tag = $tag`) sits in value position but is lexed as a key token. It
    must not be mistaken for a missing attribute key and must not produce a
    "key not found" warning.

    Regression test for https://github.com/SigNoz/engineering-pod/issues/5481
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test_variable_filter_metric"

    metrics: list[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-a"},
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-a"},
            timestamp=now - timedelta(minutes=2),
            value=30.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "sum",
        temporality="cumulative",
        filter_expression="my_tag = $tag",
    )

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query],
        variables={"tag": {"type": "query", "value": "service-a"}},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["status"] == "success"
    # `my_tag` is a real label and `$tag` is a value-position variable, so
    # neither should be flagged as a missing key on the metric.
    assert get_all_warnings(data) == [], f"expected no warnings, got: {get_all_warnings(data)}"
