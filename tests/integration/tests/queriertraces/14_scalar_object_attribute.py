from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    get_rows,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces


def test_traces_scalar_and_object_key_both_survive(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    """A span attribute stored as both a scalar and an object prefix (db.function and
    db.function.arg) keeps both dotted keys through the native JSON read. json_only writes only the
    JSON column, so no legacy attribute map backfills the keys."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    evolution_time = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=30)
    seed_attribute_evolution("traces", evolution_time)

    service = "scalar-object-service"
    span_time = evolution_time + timedelta(minutes=5)
    insert_traces(
        [
            Traces(
                timestamp=span_time,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="scalar and object",
                resources={"service.name": service},
                attributes={"db.function": "refresh", "db.function.arg": 2},
                attribute_write_mode="json_only",
            ),
        ]
    )

    response = make_query_request(
        signoz,
        token,
        start_ms=int((span_time - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((span_time + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=10,
                filter_expression=f"resource.service.name = '{service}'",
                order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
            ).to_dict()
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = get_rows(response)
    assert len(rows) == 1
    attributes = rows[0]["data"]["attributes"]
    assert attributes["db.function"] == "refresh"
    assert isinstance(attributes["db.function"], str)
    assert attributes["db.function.arg"] == 2
