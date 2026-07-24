from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import Aggregation, BuilderQuery, RequestType, make_query_request

# Traces filter validation: the body-JSON functions has()/hasToken() are not valid on the
# traces signal. These are pre-query validation errors (400) independent of ingested data.


@pytest.mark.parametrize(
    "expression",
    [
        # has()/hasToken() support only the logs body JSON field.
        pytest.param('has(service.name, "x")', id="has_on_traces"),
        pytest.param('hasToken(name, "x")', id="hastoken_on_traces"),
    ],
)
def test_traces_filter_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[BuilderQuery(signal="traces", name="A", filter_expression=expression, aggregations=[Aggregation("count()")]).to_dict()],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
