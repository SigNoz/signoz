from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.meter import MeterSample, make_meter_samples
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    MetricAggregation,
    RequestType,
    make_query_request,
)


def test_resource_default_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "service.name": "java",
                },
                attributes={
                    "service.name": "java",
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=20)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                name="A",
                signal="logs",
                filter_expression="service.name = 'java'",
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    warning = response.json()["data"].get("warning", None)
    assert warning is not None
    assert warning["message"] == "Encountered warnings"

    expected_service_name_warning = (
        "Key `service.name` is ambiguous, found 2 different combinations of "
        "field context / data type: [name=service.name,context=resource,datatype=string "
        "name=service.name,context=attribute,datatype=string]. Using `resource` context "
        "by default. To query attributes explicitly, use the fully qualified name "
        "(e.g., 'attribute.service.name')"
    )
    assert warning["warnings"] == [
        {"message": expected_service_name_warning},
    ]


def test_key_collision_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "service.name": "java",
                },
                attributes={
                    "service.name": "java",
                    "http.status_code": 200,
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "service.name": "java",
                },
                attributes={
                    "service.name": "java",
                    "http.status_code": "200",
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=20)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                name="A",
                signal="logs",
                filter_expression="http.status_code = '200'",
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    warning = response.json()["data"].get("warning", None)
    assert warning is not None
    assert warning["message"] == "Encountered warnings"

    expected_http_status_code_warning = "Key `http.status_code` is ambiguous, found 2 different combinations of field context / data type: [name=http.status_code,context=attribute,datatype=number name=http.status_code,context=attribute,datatype=string]."
    assert warning["warnings"] == [
        {"message": expected_http_status_code_warning},
    ]


def test_deduped_warnings_for_single_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    insert_logs(
        [
            *[
                Logs(
                    timestamp=datetime.now(tz=UTC) - timedelta(minutes=i * 10),
                    resources={
                        "service.name": "java",
                    },
                    attributes={
                        "service.name": "java",
                        "http.status_code": 200,
                    },
                    body="This is a log message, coming from a java application",
                    severity_text="DEBUG",
                )
                for i in range(10)
            ],
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "service.name": "java",
                },
                attributes={
                    "service.name": "java",
                    "http.status_code": "200",
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # `service.name` (resource vs attribute) and `http.status_code` (number vs
    # string) are both ambiguous keys, so referencing them in the filter makes
    # the querier emit an "is ambiguous" warning while *building* the query.
    #
    # This test targets the bucket-cache warning-merge path: the cache stores a
    # query's warnings alongside its buckets, and on a partial cache hit
    # executeWithCache merges the cached warnings with the warnings re-emitted by
    # each freshly executed missing range (querier.mergeResults). Before the
    # dedup fix the same message appeared once per executed range.
    query = BuilderQuery(
        name="A",
        signal="logs",
        step_interval=600,
        filter_expression="service.name = 'java' and http.status_code = 200",
        aggregations=[Aggregation(expression="count()")],
    ).to_dict()

    # Anchor both windows to a single "now" so their step-aligned boundaries
    # match. Both windows end well before the 5m flux interval so the results
    # are cacheable.
    now_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    minute = 60 * 1000

    # First request populates the cache for [-90m, -30m], storing the warnings.
    first = make_query_request(
        signoz,
        token,
        start_ms=now_ms - 90 * minute,
        end_ms=now_ms - 30 * minute,
        request_type=RequestType.TIME_SERIES,
        queries=[query],
        no_cache=False,
    )
    assert first.status_code == HTTPStatus.OK
    assert first.json()["status"] == "success"

    # Second request reuses the cached [-90m, -30m] buckets (which carry the
    # cached warnings) and executes only the trailing [-30m, -20m] step fresh,
    # which re-emits the same warnings — exercising the cache/fresh merge.
    response = make_query_request(
        signoz,
        token,
        start_ms=now_ms - 90 * minute,
        end_ms=now_ms - 20 * minute,
        request_type=RequestType.TIME_SERIES,
        queries=[query],
        no_cache=False,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    warning = response.json()["data"].get("warning", None)
    assert warning is not None
    assert warning["message"] == "Encountered warnings"

    # Each ambiguity warning arrives from both the cached portion and the fresh
    # missing range; after deduplication each distinct message appears once.
    expected_service_name_warning = (
        "Key `service.name` is ambiguous, found 2 different combinations of "
        "field context / data type: [name=service.name,context=resource,datatype=string "
        "name=service.name,context=attribute,datatype=string]. Using `resource` context "
        "by default. To query attributes explicitly, use the fully qualified name "
        "(e.g., 'attribute.service.name')"
    )
    expected_status_code_warning = "Key `http.status_code` is ambiguous, found 2 different combinations of field context / data type: [name=http.status_code,context=attribute,datatype=number name=http.status_code,context=attribute,datatype=string]."
    assert warning["warnings"] == [
        {"message": expected_service_name_warning},
        {"message": expected_status_code_warning},
    ]


def test_deduped_warnings_for_multiple_queries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    insert_logs(
        [
            *[
                Logs(
                    timestamp=datetime.now(tz=UTC) - timedelta(minutes=i * 10),
                    resources={
                        "service.name": "java",
                    },
                    attributes={
                        "service.name": "java",
                        "http.status_code": 200,
                    },
                    body="This is a log message, coming from a java application",
                    severity_text="DEBUG",
                )
                for i in range(10)
            ],
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "service.name": "java",
                },
                attributes={
                    "service.name": "java",
                    "http.status_code": "200",
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # `service.name` (resource vs attribute) and `http.status_code` (number vs
    # string) are both ambiguous keys, so referencing them in the filter makes
    # the querier emit an "is ambiguous" warning while *building* the query.
    query_1 = BuilderQuery(
        name="A",
        signal="logs",
        step_interval=600,
        filter_expression="service.name = 'java' and http.status_code = 200",
        aggregations=[Aggregation(expression="count()")],
    ).to_dict()
    query_2 = BuilderQuery(
        name="B",
        signal="logs",
        step_interval=600,
        filter_expression="service.name != '_java' and http.status_code = 200",
        aggregations=[Aggregation(expression="count()")],
    ).to_dict()

    now_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    minute = 60 * 1000

    response = make_query_request(
        signoz,
        token,
        start_ms=now_ms - 90 * minute,
        end_ms=now_ms - 20 * minute,
        request_type=RequestType.TIME_SERIES,
        queries=[query_1, query_2],
        no_cache=False,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    warning = response.json()["data"].get("warning", None)
    assert warning is not None
    assert warning["message"] == "Encountered warnings"

    expected_service_name_warning = (
        "Key `service.name` is ambiguous, found 2 different combinations of "
        "field context / data type: [name=service.name,context=resource,datatype=string "
        "name=service.name,context=attribute,datatype=string]. Using `resource` context "
        "by default. To query attributes explicitly, use the fully qualified name "
        "(e.g., 'attribute.service.name')"
    )
    expected_status_code_warning = "Key `http.status_code` is ambiguous, found 2 different combinations of field context / data type: [name=http.status_code,context=attribute,datatype=number name=http.status_code,context=attribute,datatype=string]."
    assert warning["warnings"] == [
        {"message": expected_service_name_warning},
        {"message": expected_status_code_warning},
    ]


def test_no_warnings_for_meter_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_meter_samples: Callable[[list[MeterSample]], None],
) -> None:
    # Meter queries deliberately suppress the step-interval clamp warning. The
    # minimum allowed step for a meter is 1h, so a 10m (600s) step over this
    # range would normally clamp and emit a warning for a regular metric — for a
    # meter source the querier discards it. This asserts no warning leaks out.
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "signoz.meter.log.size"
    insert_meter_samples(
        make_meter_samples(
            metric_name,
            {"service": "test-service"},
            now,
            count=60,
            temporality="Delta",
            type_="Sum",
            is_monotonic=True,
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=20)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            BuilderQuery(
                name="A",
                signal="metrics",
                source="meter",
                step_interval=600,
                aggregations=[MetricAggregation(metric_name=metric_name, time_aggregation="sum", space_aggregation="sum")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert "warning" not in response.json()["data"]
