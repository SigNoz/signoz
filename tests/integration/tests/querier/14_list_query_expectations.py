from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    TelemetryFieldKey,
    generate_logs_with_corrupt_metadata,
    make_query_request,
)


@pytest.mark.parametrize(
    "query,result",
    [
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         limit=1,
        #     ),
        #     lambda x: _flatten_log(x[2]),
        #     id="no-select-no-order",
        #     # Behaviour:
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("timestamp")],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-timestamp-no-order",
        #     # Behaviour:
        #     # AdjustKeys no-op
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("log.timestamp")],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-log-timestamp-no-order",
        #     # Behaviour:
        #     # AdjustKeys no-op
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("attribute.timestamp")],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-attr-timestamp-no-order",
        #     # Behaviour: [BUG - user didn't get what they expected]
        #     # AdjustKeys no-op
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[
        #             TelemetryFieldKey("log.timestamp"),
        #             TelemetryFieldKey("attribute.timestamp"),
        #         ],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-log-timestamp-and-attr-timestamp-no-order",
        #     # Behaviour: [BUG - user didn't get what they expected]
        #     # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
        #     # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
        #     # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp fields
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[
        #             TelemetryFieldKey("timestamp"),
        #             TelemetryFieldKey("attribute.timestamp"),
        #         ],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-timestamp-and-attr-timestamp-no-order",
        #     # Behaviour:
        #     # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
        #     # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp fields
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[
        #             TelemetryFieldKey("log.timestamp"),
        #             TelemetryFieldKey("timestamp"),
        #         ],
        #         limit=1,
        #     ),
        #     lambda x: [x[2].id, x[2].timestamp],
        #     id="select-log-timestamp-and-timestamp-no-order",
        #     # Behaviour:
        #     # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
        #     # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
        #     # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
        #     # Select timestamp is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                limit=1,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
            ),
            lambda x: _flatten_log(x[3]),
            id="no-select-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys no-op
            # Order by timestamp is mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("timestamp")],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys no-op
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("log.timestamp")],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input log.timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("attribute.timestamp")],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-attr-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("log.timestamp"),
                    TelemetryFieldKey("attribute.timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-and-attr-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp fields
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("timestamp"),
                    TelemetryFieldKey("attribute.timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-timestamp-and-attr-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp fields
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("log.timestamp"),
                    TelemetryFieldKey("timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-and-timestamp-order-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp fields
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                limit=1,
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
            ),
            lambda x: [],
            id="no-select-order-attr-timestamp-desc",
            # Behaviour: [BUG]
            # AdjustKeys logic adjusts key "attribute.timestamp" to "attribute.timestamp:string"
            # Because of aliasing bug, result is empty
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("timestamp")],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-timestamp-order-attr-timestamp-desc",
            # Behaviour:
            # AdjustKeys adjusts key "attribute.timestamp" to "timestamp"
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("log.timestamp")],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-order-attr-timestamp-desc",
            # Behaviour: [BUG - user didn't get what they expected]
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("attribute.timestamp")],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [],  # Because of aliasing bug, this returns no data
            id="select-attr-timestamp-order-attr-timestamp-desc",
            # Behaviour [BUG - user didn't get what they expected]:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "attribute.timestamp:string"
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Because of Logs stmt builder behaviour, we ran into aliasing bug, result is empty
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("log.timestamp"),
                    TelemetryFieldKey("attribute.timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-and-attr-timestamp-order-attr-timestamp-desc",
            # Behaviour: [BUG - user didn't get what they expected]
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Logs stmt builder by default adds timestamp field to select fields and ignores user input timestamp field
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("timestamp"),
                    TelemetryFieldKey("attribute.timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-timestamp-and-attr-timestamp-order-attr-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("log.timestamp"),
                    TelemetryFieldKey("timestamp"),
                ],
                order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")],
                limit=1,
            ),
            lambda x: [x[3].id, x[3].timestamp],
            id="select-log-timestamp-and-timestamp-order-attr-timestamp-desc",
            # Behaviour:
            # AdjustKeys logic adjusts key "attribute.timestamp" to "timestamp"
            # AdjustKeys logic adjusts key "log.timestamp" to "timestamp"
            # AdjustKeys logic removes duplicate key "timestamp", only 1 select field is left
            # Select and OrderBy both timestamp are mapped to top level field by field mapper
        ),
    ],
)
def test_logs_list_query_timestamp_expectations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    query: BuilderQuery,
    result: Callable[[list[Logs]], list[Any]],
) -> None:
    """
    Setup:
    Insert logs with corrupt data

    Tests:
    """
    logs = generate_logs_with_corrupt_metadata()
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Query Logs for the last 10 minute and check if the logs are returned in the correct order
    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[query.to_dict()],
    )

    assert response.status_code == HTTPStatus.OK

    if response.status_code == HTTPStatus.OK:
        if not result(logs):
            # No results expected
            assert response.json()["data"]["data"]["results"][0]["rows"] is None
        else:
            data = response.json()["data"]["data"]["results"][0]["rows"][0]["data"]
            for key, value in zip(list(data.keys()), result(logs)):
                assert data[key] == value


@pytest.mark.parametrize(
    "query,results",
    [
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("trace_id")],
        #     ),
        #     lambda x: [
        #         [x[2].id, x[2].timestamp, x[2].trace_id],
        #         [x[1].id, x[1].timestamp, x[1].trace_id],
        #         [x[0].id, x[0].timestamp, x[0].trace_id],
        #         [x[3].id, x[3].timestamp, x[3].trace_id],
        #     ],
        #     id="select-trace-id-no-order",
        #     # Justification (expected values and row order):
        #     # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
        #     # Order: no explicit order → ClickHouse internal storage order
        #     # Behaviour:
        #     # AdjustKeys no-op
        #     # Select trace_id is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("log.trace_id")],
        #     ),
        #     lambda x: [
        #         [x[2].id, x[2].timestamp, x[2].trace_id],
        #         [x[1].id, x[1].timestamp, x[1].trace_id],
        #         [x[0].id, x[0].timestamp, x[0].trace_id],
        #         [x[3].id, x[3].timestamp, x[3].trace_id],
        #     ],
        #     id="select-log-trace-id-no-order",
        #     # Justification (expected values and row order):
        #     # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
        #     # Order: no explicit order → ClickHouse internal storage order
        #     # Behaviour:
        #     # AdjustKeys adjusts log.trace_id to log.trace_id:string
        #     # Select log.trace_id is mapped to top level field by field mapper
        #     # Empty order results in consistent random order
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("body.trace_id")],
        #     ),
        #     lambda x: [
        #         [x[2].id, x[2].timestamp, x[2].trace_id],
        #         [x[1].id, x[1].timestamp, x[1].trace_id],
        #         [x[0].id, x[0].timestamp, x[0].trace_id],
        #         [x[3].id, x[3].timestamp, x[3].trace_id],
        #     ],
        #     id="select-body-trace-id-no-order",
        #     # Justification (expected values and row order):
        #     # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
        #     # Order: no explicit order → ClickHouse internal storage order
        #     # Behaviour:
        #     # AdjustKeys logic adjusts key "body.trace_id" to "log.trace_id:string"
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("attribute.trace_id")],
        #     ),
        #     lambda x: [
        #         [x[2].id, x[2].timestamp, x[2].attributes_string.get("trace_id", "")],
        #         [x[1].id, x[1].timestamp, x[1].attributes_string.get("trace_id", "")],
        #         [x[0].id, x[0].timestamp, x[0].attributes_string.get("trace_id", "")],
        #         [x[3].id, x[3].timestamp, x[3].attributes_string.get("trace_id", "")],
        #     ],
        #     id="select-attribute-trace-id-no-order",
        #     # Justification (expected values and row order):
        #     # Values: x[0]="", x[1]="2", x[2]="", x[3]="" (only x[1] has attribute.trace_id set)
        #     # Order: no explicit order → ClickHouse internal storage order
        #     # Behaviour:
        #     # AdjustKeys no-op
        # ),
        # pytest.param(
        #     BuilderQuery(
        #         signal="logs",
        #         name="A",
        #         select_fields=[TelemetryFieldKey("resource.trace_id")],
        #     ),
        #     lambda x: [
        #         [x[2].id, x[2].timestamp, x[2].resources_string.get("trace_id", "")],
        #         [x[1].id, x[1].timestamp, x[1].resources_string.get("trace_id", "")],
        #         [x[0].id, x[0].timestamp, x[0].resources_string.get("trace_id", "")],
        #         [x[3].id, x[3].timestamp, x[3].resources_string.get("trace_id", "")],
        #     ],
        #     id="select-resource-trace-id-no-order",
        #     # Justification (expected values and row order):
        #     # Values: x[0]="", x[1]="", x[2]="3", x[3]="" (only x[2] has resource.trace_id set)
        #     # Order: no explicit order → ClickHouse internal storage order
        #     # Behaviour:
        #     # AdjustKeys no-op
        # ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                order=[OrderBy(TelemetryFieldKey("trace_id"), "desc")],
            ),
            lambda x: [
                _flatten_log(x[0]),
                _flatten_log(x[2]),
                _flatten_log(x[1]),
                _flatten_log(x[3]),
            ],
            id="no-select-trace-id-order",
            # Justification (expected values and row order):
            # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
            # Order: trace_id DESC → x[0]("1") first, then x[2](""), x[1](""), x[3]("") in storage order
            # Behaviour:
            # AdjustKeys no-op
            # Order by trace_id is mapped to top level field by field mapper
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                order=[OrderBy(TelemetryFieldKey("attribute.trace_id"), "desc")],
            ),
            lambda x: [
                [*_flatten_log(x[1])[:14], x[1].attributes_string.get("trace_id", "")],
                [*_flatten_log(x[2])[:14], x[2].attributes_string.get("trace_id", "")],
                [*_flatten_log(x[0])[:14], x[0].attributes_string.get("trace_id", "")],
                [*_flatten_log(x[3])[:14], x[3].attributes_string.get("trace_id", "")],
            ],
            id="no-select-attribute-trace-id-order",
            # Justification (expected values and row order):
            # attribute.trace_id values: x[0]="", x[1]="2", x[2]="", x[3]=""
            # Behaviour: [BUG - user didn't get what they expected]
            # AdjustKeys adjusts "attribute.trace_id" to "attribute.trace_id:string"
            # Order by attribute.trace_id maps to attributes_string['trace_id']
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("trace_id")],
                order=[OrderBy(TelemetryFieldKey("trace_id"), "desc")],
            ),
            lambda x: [
                [x[0].id, x[0].timestamp, x[0].trace_id],
                [x[2].id, x[2].timestamp, x[2].trace_id],
                [x[1].id, x[1].timestamp, x[1].trace_id],
                [x[3].id, x[3].timestamp, x[3].trace_id],
            ],
            id="select-trace-id-order-trace-id-desc",
            # Justification (expected values and row order):
            # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
            # Order: trace_id DESC → x[0]("1") first, then x[2](""), x[1](""), x[3]("") in storage order
            # Behaviour:
            # AdjustKeys no-op
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("attribute.trace_id")],
                order=[OrderBy(TelemetryFieldKey("attribute.trace_id"), "desc")],
            ),
            lambda x: [
                [x[1].id, x[1].timestamp, x[1].attributes_string.get("trace_id", "")],
                [x[2].id, x[2].timestamp, x[2].attributes_string.get("trace_id", "")],
                [x[0].id, x[0].timestamp, x[0].attributes_string.get("trace_id", "")],
                [x[3].id, x[3].timestamp, x[3].attributes_string.get("trace_id", "")],
            ],
            id="select-attribute-trace-id-order-attribute-trace-id-desc",
            # Justification (expected values and row order):
            # AdjustKeys: no-op for both select and order, "attribute.trace_id" is a valid attribute key
            # Field mapping: "attribute.trace_id" → attributes_string["trace_id"]
            # Values: x[0]="", x[1]="2", x[2]="", x[3]="" (only x[1] has attribute.trace_id set)
            # Order: attribute.trace_id DESC → x[1]("2") first, then x[2](""), x[0](""), x[3]("") in storage order
            # Behaviour:
            # AdjustKeys no-op
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("resource.trace_id")],
                order=[OrderBy(TelemetryFieldKey("resource.trace_id"), "desc")],
            ),
            lambda x: [
                [x[2].id, x[2].timestamp, x[2].resources_string.get("trace_id", "")],
                [x[1].id, x[1].timestamp, x[1].resources_string.get("trace_id", "")],
                [x[0].id, x[0].timestamp, x[0].resources_string.get("trace_id", "")],
                [x[3].id, x[3].timestamp, x[3].resources_string.get("trace_id", "")],
            ],
            id="select-resource-trace-id-order-resource-trace-id-desc",
            # Justification (expected values and row order):
            # AdjustKeys: no-op for both select and order, "resource.trace_id" is a valid resource key
            # Field mapping: "resource.trace_id" → resources_string["trace_id"]
            # Values: x[0]="", x[1]="", x[2]="3", x[3]="" (only x[2] has resource.trace_id set)
            # Order: resource.trace_id DESC → x[2]("3") first, then x[1](""), x[0](""), x[3]("") in storage order
            # Behaviour:
            # AdjustKeys no-op
        ),
        pytest.param(
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[TelemetryFieldKey("body.trace_id")],
                order=[OrderBy(TelemetryFieldKey("body.trace_id"), "desc")],
            ),
            lambda x: [
                [x[0].id, x[0].timestamp, x[0].trace_id],
                [x[2].id, x[2].timestamp, x[2].trace_id],
                [x[1].id, x[1].timestamp, x[1].trace_id],
                [x[3].id, x[3].timestamp, x[3].trace_id],
            ],
            id="select-body-trace-id-order-body-trace-id-desc",
            # Justification (expected values and row order):
            # AdjustKeys: adjusts "body.trace_id" to "log.trace_id:string" for both select and order
            # Field mapping: "log.trace_id:string" → top-level trace_id column
            # Values: x[0].trace_id="1", x[1].trace_id="", x[2].trace_id="", x[3].trace_id=""
            # Order: trace_id DESC → x[0]("1") first, then x[2](""), x[1](""), x[3]("") in storage order
            # Behaviour:
            # AdjustKeys logic adjusts key "body.trace_id" to "log.trace_id:string"
        ),
    ],
)
def test_logs_list_query_trace_id_expectations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    query: BuilderQuery,
    results: Callable[[list[Logs]], list[Any]],
) -> None:
    """
    Justification for expected rows and ordering:
    Four logs differ by where trace_id is set: top-level (x[0]), attribute (x[1]),
    resource (x[2]), or only in body text (x[3]). Each parametrized case documents
    which column AdjustKeys/field mapping reads and why DESC ties break in storage order.

    Setup:
    Insert logs with corrupt trace_id

    Tests:
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    logs = [
        Logs(
            timestamp=now - timedelta(seconds=4),
            body="POST /integration request received",
            severity_text="INFO",
            resources={
                "service.name": "http-service",
                "timestamp": "corrupt_data",
            },
            attributes={
                "severity_text": "corrupt_data",
                "timestamp": "corrupt_data",
            },
            trace_id="1",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            body="SELECT query executed",
            severity_text="DEBUG",
            resources={
                "service.name": "http-service",
                "id": "corrupt_data",
            },
            attributes={
                "trace_id": "2",
            },
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            body="HTTP PATCH failed with 404",
            severity_text="WARN",
            resources={
                "service.name": "http-service",
                "body": "corrupt_data",
                "trace_id": "3",
            },
            attributes={
                "id": "1",
            },
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            body="{'trace_id': '4'}",
            severity_text="ERROR",
            resources={
                "service.name": "topic-service",
            },
            attributes={
                "body": "corrupt_data",
                "timestamp": "corrupt_data",
            },
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Query Logs for the last 10 minute and check if the logs are returned in the correct order
    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[query.to_dict()],
    )

    assert response.status_code == HTTPStatus.OK

    if response.status_code == HTTPStatus.OK:
        if not results(logs):
            # No results expected
            assert response.json()["data"]["data"]["results"][0]["rows"] is None
        else:
            print(response.json())
            rows = response.json()["data"]["data"]["results"][0]["rows"]
            assert len(rows) == len(results(logs)), f"Expected {len(results(logs))} rows, got {len(rows)}"
            for row, expected_row in zip(rows, results(logs)):
                data = row["data"]
                keys = list(data.keys())
                for i, expected_value in enumerate(expected_row):
                    assert data[keys[i]] == expected_value, f"Row mismatch at key '{keys[i]}': expected {expected_value}, got {data[keys[i]]}"


def _flatten_log(log: Logs) -> list[Any]:
    return [
        log.attributes_bool,
        log.attributes_number,
        log.attributes_string,
        log.body,
        log.id,
        log.resources_string,
        log.scope_name,
        log.scope_string,
        log.scope_version,
        log.severity_number,
        log.severity_text,
        log.span_id,
        log.timestamp,
        log.trace_flags,
        log.trace_id,
    ]
