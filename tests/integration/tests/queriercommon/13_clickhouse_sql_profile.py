from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_clickhouse_sql_runs_with_profile(
    signoz_clickhouse_query_profile: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    response = querier.make_query_request(
        signoz_clickhouse_query_profile,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT toFloat64(getSetting('max_result_rows')) AS value", "disabled": False}}],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["data"]["results"][0]["data"][0][0] == 100


@pytest.mark.parametrize(
    "settings",
    [
        "max_result_rows = 1000",
        "max_result_rows = 0",
        "profile = 'default', max_result_rows = 1000",
    ],
    ids=["above_max", "zero_is_unlimited", "switch_profile_then_raise"],
)
def test_clickhouse_sql_settings_cannot_escape_profile(
    signoz_clickhouse_query_profile: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    settings: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    response = querier.make_query_request(
        signoz_clickhouse_query_profile,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": f"SELECT toFloat64(1) AS value SETTINGS {settings}", "disabled": False}}],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert (error["code"], error["suggestions"]) == ("setting_not_allowed", ["remove the setting from the SETTINGS clause of the query"]), error
