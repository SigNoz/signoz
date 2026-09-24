from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import get_all_warnings, get_scalar_table_data, make_scalar_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# Unknown-key resolution in the scalar shape (group-by -> one value per bucket). Logs/traces
# synthesize an unknown key (attribute maps + body). Observed here: the *filter* path emits a
# key-not-found warning and matches nothing (count 0); the *group-by* path silently buckets
# every record into a single NULL bucket and emits no warning.
UNKNOWN = "totally.unknown.key"


def test_logs_scalar_filter_unknown_key_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A scalar count() filtered on an unknown bare key synthesizes columns: 200 with a
    key-not-found warning, matching nothing (count 0)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "svc"}, body=f"log {i}") for i in range(4)])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[querier.build_aggregation("count()")],
                filter_expression=f'{UNKNOWN} = "x"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    messages = [w.get("message", "") for w in get_all_warnings(response.json())]
    assert any(UNKNOWN in m and "not found" in m for m in messages), messages
    assert get_scalar_table_data(response.json()) == [[0]]


def test_logs_scalar_group_by_over_empty_filter_returns_no_rows(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """The contrast to the ungrouped filter case (which returns [[0]]): the *same* empty-match
    filter with a group-by returns no rows at all — zero matching records means zero groups.
    A regression toward [[0]] (or the ungrouped case toward []) breaks this invariant."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "svc"}, body=f"log {i}") for i in range(4)])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[querier.build_aggregation("count()")],
                group_by=[querier.build_group_by_field("service.name", "string", "resource")],
                filter_expression=f'{UNKNOWN} = "x"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert get_scalar_table_data(response.json()) == []


def test_logs_scalar_group_by_unknown_key_null_bucket(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Grouping a scalar count() by an unknown bare key synthesizes a NULL column: all records
    collapse into one bucket (200), and — unlike the filter path — no key-not-found warning."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "scalar-unknown-gb-logs"
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": service}, body=f"log {i}") for i in range(4)])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[querier.build_aggregation("count()")],
                group_by=[querier.build_group_by_field(UNKNOWN, "string", "")],
                filter_expression=f'service.name = "{service}"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    messages = [w.get("message", "") for w in get_all_warnings(response.json())]
    assert not any(UNKNOWN in m for m in messages), messages
    data = get_scalar_table_data(response.json())
    assert len(data) == 1, data
    assert data[0][-1] == 4, data


def test_traces_scalar_filter_unknown_key_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A scalar count() filtered on an unknown bare key synthesizes columns: 200 with a
    key-not-found warning, matching nothing (count 0)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": "svc"},
                name=f"span {i}",
            )
            for i in range(4)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="traces",
                aggregations=[querier.build_aggregation("count()")],
                filter_expression=f'{UNKNOWN} = "x"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    messages = [w.get("message", "") for w in get_all_warnings(response.json())]
    assert any(UNKNOWN in m and "not found" in m for m in messages), messages
    assert get_scalar_table_data(response.json()) == [[0]]


def test_traces_scalar_group_by_unknown_key_null_bucket(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Grouping a scalar count() by an unknown bare key synthesizes a NULL column: all spans
    collapse into one bucket (200), and — unlike the filter path — no key-not-found warning."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "scalar-unknown-gb-traces"
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": service},
                name=f"span {i}",
            )
            for i in range(4)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="traces",
                aggregations=[querier.build_aggregation("count()")],
                group_by=[querier.build_group_by_field(UNKNOWN, "string", "")],
                filter_expression=f'service.name = "{service}"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    messages = [w.get("message", "") for w in get_all_warnings(response.json())]
    assert not any(UNKNOWN in m for m in messages), messages
    data = get_scalar_table_data(response.json())
    assert len(data) == 1, data
    assert data[0][-1] == 4, data
