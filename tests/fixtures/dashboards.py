from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types

DASHBOARDS_BASE_URL = "/api/v2/dashboards"
# MaxListLimit caps a single list page, so wiping a shared DB has to drain pages
# until the list comes back empty.
MAX_LIST_LIMIT = 200


@pytest.fixture(name="wipe_all_dashboards", scope="function")
def wipe_all_dashboards(signoz: types.SigNoz) -> Callable[[str], None]:
    def _wipe_all_dashboards(token: str) -> None:
        while True:
            response = requests.get(
                signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}?limit={MAX_LIST_LIMIT}"),
                headers={"Authorization": f"Bearer {token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.OK, response.text
            dashboards = response.json()["data"]["dashboards"]
            if not dashboards:
                return
            for dashboard in dashboards:
                del_res = requests.delete(
                    signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard['id']}"),
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5,
                )
                assert del_res.status_code == HTTPStatus.NO_CONTENT, del_res.text

    return _wipe_all_dashboards
