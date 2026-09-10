from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

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
MINUTE_MS = 60_000

METRIC_NAME = "test_heatmap_rejections"
QUERY = [build_builder_query("A", METRIC_NAME, "max", "max")]


@pytest.mark.parametrize(
    "queries, request_options, expected_message",
    [
        # a promql or clickhouse query cuts its own buckets, so neither spec has
        # anywhere to state an axis
        pytest.param(
            [{"type": "promql", "spec": {"name": "A", "query": METRIC_NAME, "bucketOptions": build_log_bucket_options(2)}}],
            {},
            'unknown field "bucketOptions" in PromQL spec',
            id="bucket_options_on_a_promql_query",
        ),
        pytest.param(
            [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT 1", "bucketOptions": build_log_bucket_options(2)}}],
            {},
            'unknown field "bucketOptions" in ClickHouse SQL spec',
            id="bucket_options_on_a_clickhouse_query",
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
            "a heatmap renders one distribution, but 2 queries are enabled",
            id="two_enabled_queries",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max"),
                build_builder_query("B", METRIC_NAME, "min", "min", disabled=True),
                build_formula_query("F1", "B"),
            ],
            {},
            "a heatmap renders one distribution, but 2 queries are enabled",
            id="a_formula_beside_an_enabled_query",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", disabled=True)],
            {},
            "a heatmap needs one enabled query, but every query is disabled",
            id="only_a_disabled_query",
        ),
        # an empty body is refused while resources are extracted from it, before
        # anything heatmap specific runs, so match either wording of that message
        pytest.param(
            [],
            {},
            "one query is required",
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
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "quadratic", "spec": {}})],
            {},
            "invalid bucketOptions kind",
            id="unknown_bucket_kind",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "log"})],
            {},
            "bucketOptions spec is required",
            id="log_without_a_spec",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "linear"})],
            {},
            "bucketOptions spec is required",
            id="linear_without_a_spec",
        ),
        # the query spec is strict-decoded, so it names itself rather than the
        # buckets spec the field is actually wrong in
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "linear", "spec": {"maxValue": 1000, "scale": 2}})],
            {},
            'unknown field "scale" in query spec',
            id="scale_under_the_linear_kind",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "log", "spec": {"scale": 5}})],
            {},
            "scale must be between -4 and 4",
            id="scale_above_the_maximum",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "log", "spec": {"scale": -5}})],
            {},
            "scale must be between -4 and 4",
            id="scale_below_the_minimum",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "linear", "spec": {"maxValue": 0}})],
            {},
            "linear buckets need a finite maxValue greater than 0",
            id="zero_max_value",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "linear", "spec": {"maxValue": -10}})],
            {},
            "linear buckets need a finite maxValue greater than 0",
            id="negative_max_value",
        ),
        pytest.param(
            [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options={"kind": "linear", "spec": {"maxValue": 1000, "numBuckets": 513}})],
            {},
            "numBuckets must be between 1 and 512",
            id="too_many_buckets",
        ),
        pytest.param(
            [
                build_builder_query("A", METRIC_NAME, "max", "max", disabled=True),
                build_formula_query("F1", "A", bucket_options={"kind": "log", "spec": {"scale": 5}}),
            ],
            {},
            "scale must be between -4 and 4",
            id="scale_on_the_formula",
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
        [build_builder_query("A", METRIC_NAME, "max", "max", bucket_options=build_log_bucket_options(2))],
        request_type=request_type,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "bucketOptions are only supported for heatmap requests" in get_error_message(response.json())


@pytest.mark.parametrize(
    "columns, expected_message",
    [
        pytest.param(
            [
                "toFloat64(10) AS `__bucket_min`, toFloat64(20) AS `__bucket_max`, toFloat64(3) AS `__result_0`",
                "toFloat64(12) AS `__bucket_min`, toFloat64(20) AS `__bucket_max`, toFloat64(7) AS `__result_0`",
            ],
            # which of the two lower bounds is named first follows the row order
            # the union happens to return
            "the bucket ending at 20 is reported as starting at both",
            id="one_bucket_cut_two_ways",
        ),
        pytest.param(
            [
                "toFloat64(20) AS `__bucket_max`, toFloat64(3) AS `__result_0`",
                "toFloat64(30) AS `__bucket_max`, toFloat64(7) AS `__result_0`",
            ],
            'a heatmap needs a "__bucket_min" and a "__bucket_max" column',
            id="upper_bound_without_a_lower_one",
        ),
        pytest.param(
            ["toFloat64(3) AS `__result_0`"],
            'a heatmap needs a "__bucket_min" and a "__bucket_max" column',
            id="neither_bound",
        ),
    ],
)
def test_clickhouse_bucketing_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    columns: list[str],
    expected_message: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start = now - timedelta(minutes=2)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    ts = f"toDateTime({int(start.timestamp())}) AS ts"
    response = make_query_request(
        signoz,
        token,
        int(start.timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": " UNION ALL ".join(f"SELECT {ts}, {row}" for row in columns),
                    "disabled": False,
                },
            }
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert expected_message in get_error_message(response.json())


def test_promql_returning_no_le_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric = f"promql_heatmap_gauge_{uuid4().hex[:8]}"
    end_ms = (int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000) // MINUTE_MS) * MINUTE_MS
    start_ms = end_ms - MINUTE_MS

    # the metric has to return something, since an empty result is the window
    # having no data rather than a query that can never draw a heatmap
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"service": "api"},
                timestamp=datetime.fromtimestamp(ts_ms / 1000, tz=UTC),
                value=42.0,
                type_="Gauge",
                is_monotonic=False,
            )
            for ts_ms in range(start_ms, end_ms + 1, MINUTE_MS)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [{"type": "promql", "spec": {"name": "A", "query": metric, "step": 60}}],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "no `le` labels to build a bucket axis from" in get_error_message(response.json())


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
        [build_builder_query("A", metric_name, "increase", "p50", bucket_options=build_log_bucket_options(2))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "bucketOptions are not supported for histogram metrics" in get_error_message(response.json())
