import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs

# A raw ClickHouse query is the one place a JSON column can land in a scalar or
# time-series result: the builder only selects body_v2 in raw list queries.

DOC_ERROR = {"level": "error", "attrs": {"code": 500}}
DOC_WARN = {"level": "warn"}

SERVICE = "json-column-scan"
WHERE = f"resources_string['service.name'] = '{SERVICE}'"


def test_clickhouse_scalar_with_json_column(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A scalar result carrying the body_v2 JSON column decodes it into an object."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=seconds),
                resources={"service.name": SERVICE},
                body_v2=json.dumps(doc, separators=(",", ":")),
                body_promoted="",
                severity_text="INFO",
            )
            for seconds, doc in [(3, DOC_ERROR), (2, DOC_ERROR), (1, DOC_WARN)]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # `select *` picks up body_v2 without naming it
    response = querier.make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": f"SELECT * FROM signoz_logs.distributed_logs_v2 WHERE {WHERE} ORDER BY timestamp LIMIT 1",
                    "disabled": False,
                },
            }
        ],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    columns = [column["name"] for column in querier.get_scalar_columns(response.json())]
    rows = querier.get_scalar_table_data(response.json())
    assert len(rows) == 1
    assert rows[0][columns.index("body_v2")] == DOC_ERROR

    # a JSON column is a legal GROUP BY key, so it can sit next to an aggregation
    response = querier.make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": f"SELECT body_v2, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE {WHERE} GROUP BY body_v2",
                    "disabled": False,
                },
            }
        ],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    rows = querier.get_scalar_table_data(response.json())
    counts = {json.dumps(row[0], sort_keys=True): row[1] for row in rows}
    assert counts == {
        json.dumps(DOC_ERROR, sort_keys=True): 2,
        json.dumps(DOC_WARN, sort_keys=True): 1,
    }


def test_clickhouse_time_series_grouped_by_json_column(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Grouping a graph by the JSON column labels each series with its document."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=seconds),
                resources={"service.name": SERVICE},
                body_v2=json.dumps(doc, separators=(",", ":")),
                body_promoted="",
                severity_text="INFO",
            )
            for seconds, doc in [(3, DOC_ERROR), (2, DOC_ERROR), (1, DOC_WARN)]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = querier.make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": (f"SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, body_v2, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE {WHERE} GROUP BY ts, body_v2"),
                    "disabled": False,
                },
            }
        ],
        request_type=querier.RequestType.TIME_SERIES,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    series = querier.get_all_series(response.json(), "A")
    assert len(series) == 2

    # One series per document, labelled with the document rendered with sorted keys. The label is
    # the verbatim group key, so it keeps the `message: ""` the typed body path materializes into
    # every document; points may split across minute buckets, so compare the per-series sum.
    counts = {}
    for single_series in series:
        labels = single_series["labels"]
        assert len(labels) == 1
        assert labels[0]["key"]["name"] == "body_v2"
        counts[labels[0]["value"]] = sum(point["value"] for point in single_series["values"])
    assert counts == {
        json.dumps(DOC_ERROR | {"message": ""}, sort_keys=True, separators=(",", ":")): 2,
        json.dumps(DOC_WARN | {"message": ""}, sort_keys=True, separators=(",", ":")): 1,
    }
