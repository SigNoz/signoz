from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import RequestType, build_aggregation, build_traces_scalar_query, get_preview_statements, make_preview_query_request
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, Traces

PROMOTED_PATHS = "/api/v1/promoted_paths"
MATERIALIZED_PATH = "/api/v1/promoted_paths/materialized"
PROBE_INDEX_EXPRS_QUERY = "SELECT expr FROM system.data_skipping_indices WHERE database = 'signoz_traces' AND table = 'signoz_index_v3' AND expr LIKE 'CAST(%materialized.%probe%'"


def test_index_materialized_paths(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    materialize_attribute: Callable[..., str],
) -> None:
    materialize_attribute("traces", "materialized.probe", True)
    materialize_attribute("traces", "materialized.unindexed_probe", False)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "traces", "dryRun": True},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    indexed = {path["path"]: path["indexes"] for path in resp.json()["data"]["indexed"]}
    assert indexed["materialized.probe"] == [{"fieldDataType": "string", "type": "bloom_filter(0.01)", "granularity": 64}]
    assert "materialized.unindexed_probe" not in indexed
    assert not signoz.telemetrystore.conn.query(PROBE_INDEX_EXPRS_QUERY).result_rows

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "logs"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    assert not signoz.telemetrystore.conn.query(PROBE_INDEX_EXPRS_QUERY).result_rows

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "traces"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert "materialized.probe" in {path["path"] for path in resp.json()["data"]["indexed"]}
    assert [row[0] for row in signoz.telemetrystore.conn.query(PROBE_INDEX_EXPRS_QUERY).result_rows] == ["CAST(attributes.`materialized.probe`, 'String')"]

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "traces"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert "materialized.probe" not in {path["path"] for path in resp.json()["data"]["indexed"]}
    assert "materialized.probe" in {path["path"] for path in resp.json()["data"]["skipped"]}


def test_index_materialized_number_path(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    materialize_attribute: Callable[..., str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    materialize_attribute("traces", "materialized.number_probe", True, "number")
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "traces"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    indexed = {path["path"]: path["indexes"] for path in resp.json()["data"]["indexed"]}
    assert indexed["materialized.number_probe"] == [{"fieldDataType": "number", "type": "bloom_filter(0.01)", "granularity": 64}]
    exprs = signoz.telemetrystore.conn.query("SELECT expr FROM system.data_skipping_indices WHERE database = 'signoz_traces' AND table = 'signoz_index_v3' AND expr LIKE '%materialized.number_probe%'").result_rows
    assert [row[0] for row in exprs] == ["toFloat64OrNull(CAST(attributes.`materialized.number_probe`, 'String'))"]

    resp = requests.get(
        signoz.self.host_configs["8080"].get(PROMOTED_PATHS),
        params={"signal": "traces", "context": "attribute"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    listed = {path["path"]: path.get("indexes") for path in resp.json()["data"]}
    assert listed["materialized.number_probe"] == [{"fieldDataType": "float64", "type": "bloom_filter(0.01)", "granularity": 64}]

    # a non-numeric value must not fail the insert on the numeric index
    insert_traces([Traces(attributes={"materialized.number_probe": 200}), Traces(attributes={"materialized.number_probe": "not-a-number"})])
    assert signoz.telemetrystore.conn.query("SELECT count() FROM signoz_traces.distributed_signoz_index_v3 WHERE attributes.`materialized.number_probe` IS NOT NULL").result_rows == [(2,)]


def test_index_materialized_number_path_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    materialize_attribute: Callable[..., str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    materialize_attribute("traces", "materialized.prune_probe", True, "number")
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(MATERIALIZED_PATH),
        json={"signal": "traces"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    [(index_name,)] = signoz.telemetrystore.conn.query("SELECT name FROM system.data_skipping_indices WHERE database = 'signoz_traces' AND table = 'signoz_index_v3' AND expr LIKE 'toFloat64OrNull(%materialized.prune_probe%'").result_rows

    # a window no other test writes to, so every granule read was written after the index existed
    window = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(days=1)
    insert_traces([Traces(timestamp=window, attributes={"materialized.prune_probe": 200}) for _ in range(3)])

    for filter_expression, prunes in [("materialized.prune_probe = 404", True), ("materialized.prune_probe = 200", False)]:
        preview = make_preview_query_request(
            signoz,
            token,
            start_ms=int((window - timedelta(minutes=1)).timestamp() * 1000),
            end_ms=int((window + timedelta(minutes=1)).timestamp() * 1000),
            request_type=RequestType.SCALAR,
            queries=[build_traces_scalar_query(aggregations=[build_aggregation("count()")], filter_expression=filter_expression)],
        )
        statements = get_preview_statements(preview, "A")
        assert all(statement["granules"] for statement in statements), preview.json()["data"]["compositeQuery"]["A"]["warnings"]
        steps = [step for statement in statements for read in statement["granules"]["reads"] for step in read["steps"] if step["name"] == index_name]
        assert steps, f"{index_name} not used for {filter_expression}: {statements}"
        assert sum(step["initialGranules"] for step in steps) > 0, filter_expression
        assert (sum(step["selectedGranules"] for step in steps) == 0) == prunes, steps
