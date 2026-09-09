from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    build_builder_query,
    build_formula_query,
    build_function,
    build_log_bucket_options,
    get_error_message,
    make_query_request,
)

HISTOGRAM_FILE = get_testdata_file_path("histogram_data_1h.jsonl")

METRIC_NAME = "test_heatmap_rejections"
QUERY = [build_builder_query("A", METRIC_NAME, "max", "max")]


@pytest.mark.parametrize(
    "queries, request_options, expected_message",
    [
        pytest.param(
            [{"type": "promql", "spec": {"name": "A", "query": METRIC_NAME}}],
            {"bucket_options": build_log_bucket_options(2)},
            "bucketOptions are not supported for promql heatmap requests",
            id="bucket_options_on_a_promql_query",
        ),
        pytest.param(
            QUERY,
            {"format_options": {"formatTableResultForUI": False, "fillGaps": True}},
            "fillGaps is not supported for heatmap requests",
            id="fill_gaps",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max"),
                build_builder_query("B", METRIC_NAME, "min", "min"),
            ],
            {},
            "heatmap requests need exactly one enabled query, got 2",
            id="two_enabled_queries",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max"),
                build_builder_query("B", METRIC_NAME, "min", "min", disabled=True),
                build_formula_query("F1", "B"),
            ],
            {},
            "heatmap requests need exactly one enabled query, got 2",
            id="a_formula_beside_an_enabled_query",
        ),
        # the composite query is turned away before the heatmap rules are reached,
        # so only the rejection itself is the heatmap's contract here
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", disabled=True)],
            {},
            "",
            id="only_a_disabled_query",
        ),
        pytest.param(
            [],
            {},
            "",
            id="no_queries",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", functions=[build_function("absolute")])],
            {},
            "functions are not supported for heatmap requests",
            id="functions_on_the_query",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max", disabled=True, functions=[build_function("absolute")]),
                build_formula_query("F1", "A"),
            ],
            {},
            "functions are not supported for heatmap requests",
            id="functions_on_a_disabled_formula_input",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max", disabled=True),
                build_formula_query("F1", "A", functions=[build_function("absolute")]),
            ],
            {},
            "functions are not supported for heatmap requests",
            id="functions_on_the_formula",
        ),
        pytest.param(
            [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "metrics",
                        "aggregations": [{"metricName": METRIC_NAME, "timeAggregation": "max", "spaceAggregation": "max"}],
                        "stepInterval": 60,
                        "having": {"expression": "value > 1"},
                    },
                }
            ],
            {},
            "having is not supported for heatmap requests",
            id="having_on_the_query",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "quadratic", "spec": {}}},
            "invalid bucketOptions kind",
            id="unknown_bucket_kind",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "log"}},
            "bucketOptions spec is required",
            id="log_without_a_spec",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "linear"}},
            "bucketOptions spec is required",
            id="linear_without_a_spec",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "linear", "spec": {"maxValue": 1000, "scale": 2}}},
            'unknown field "scale" in linear buckets spec',
            id="scale_under_the_linear_kind",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "log", "spec": {"scale": 5}}},
            "scale must be between -4 and 4",
            id="scale_above_the_maximum",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "log", "spec": {"scale": -5}}},
            "scale must be between -4 and 4",
            id="scale_below_the_minimum",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "linear", "spec": {"maxValue": 0}}},
            "linear buckets need a finite maxValue greater than 0",
            id="zero_max_value",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "linear", "spec": {"maxValue": -10}}},
            "linear buckets need a finite maxValue greater than 0",
            id="negative_max_value",
        ),
        pytest.param(
            QUERY,
            {"bucket_options": {"kind": "linear", "spec": {"maxValue": 1000, "numBuckets": 513}}},
            "numBuckets must be between 1 and 512",
            id="too_many_buckets",
        ),
    ],
)
def test_heatmap_request_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    queries: list[dict],
    request_options: dict,
    expected_message: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=30)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        queries,
        request_type=RequestType.HEATMAP,
        **request_options,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert expected_message in get_error_message(response.json())


@pytest.mark.parametrize(
    "request_type",
    [RequestType.TIME_SERIES, RequestType.SCALAR, RequestType.RAW],
    ids=["time_series", "scalar", "raw"],
)
def test_bucket_options_outside_a_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    request_type: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=30)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        QUERY,
        request_type=request_type,
        bucket_options=build_log_bucket_options(2),
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "bucketOptions are only supported for heatmap requests" in get_error_message(response.json())


def test_histogram_rejects_bucket_options(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_histogram_with_bucket_options"

    insert_metrics(
        Metrics.load_from_file(
            HISTOGRAM_FILE,
            base_time=now - timedelta(minutes=60),
            metric_name_override=metric_name,
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "increase", "p50")],
        request_type=RequestType.HEATMAP,
        bucket_options=build_log_bucket_options(2),
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "bucketOptions are not supported for histogram metrics" in get_error_message(response.json())
