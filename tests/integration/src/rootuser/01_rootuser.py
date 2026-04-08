import time
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_root_user_created(signoz: types.SigNoz) -> None:
    """
    The root user service reconciles asynchronously after startup.

    Phase 1: Poll /api/v1/version until setupCompleted=true.
    Phase 2: Poll /api/v2/users until it returns 200, confirming the root
             user actually exists and the impersonation provider works.
    """
    # Phase 1: wait for setupCompleted
    for attempt in range(15):
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v1/version"),
            timeout=2,
        )
        assert response.status_code == HTTPStatus.OK
        if response.json().get("setupCompleted") is True:
            break
        logger.info(
            "Attempt %s: setupCompleted is not yet true, retrying ...",
            attempt + 1,
        )
        time.sleep(2)
    else:
        raise AssertionError(
            "setupCompleted did not become true within the expected time"
        )

    # Phase 2: wait for root user to be fully resolved
    for attempt in range(15):
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/users"),
            timeout=2,
        )
        if response.status_code == HTTPStatus.OK:
            return
        logger.info(
            "Attempt %s: /api/v2/users returned %s, retrying ...",
            attempt + 1,
            response.status_code,
        )
        time.sleep(2)

    raise AssertionError("root user was not created within the expected time")
