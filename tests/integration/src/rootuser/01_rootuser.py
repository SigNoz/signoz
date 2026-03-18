import time
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_root_user_created(signoz: types.SigNoz) -> None:
    """
    The root user service reconciles asynchronously after startup.
    Wait until the root user is available by polling /api/v1/version.
    """
    for attempt in range(15):
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v1/version"),
            timeout=2,
        )
        assert response.status_code == HTTPStatus.OK
        if response.json().get("setupCompleted") is True:
            return
        logger.info(
            "Attempt %s: setupCompleted is not yet true, retrying ...",
            attempt + 1,
        )
        time.sleep(2)

    raise AssertionError("root user was not created within the expected time")
