import time
import uuid
from http import HTTPStatus
from typing import Callable, List

import requests
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_webhook_notification_channel(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, List[Mapping]], None],
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
) -> None:
    """
    Tests the creation and delivery of test alerts on the created notification channel
    """

    # Prepare notification channel name and webhook endpoint
    notification_channel_name = f"notification-channel-{uuid.uuid4()}"
    webhook_endpoint_path = f"/alert/{notification_channel_name}"
    webhook_endpoint = notification_channel.container_configs["8080"].get(
        webhook_endpoint_path
    )

    # register the mock endpoint in notification channel
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=webhook_endpoint_path,
                ),
                response=MappingResponse(
                    status=200,
                    json_body={},
                ),
                persistent=False,
            )
        ],
    )

    # Create an alert channel using the given route
    create_webhook_notification_channel(
        channel_name=notification_channel_name,
        webhook_url=webhook_endpoint,
        http_config={},
        send_resolved=True,
    )

    # TODO: @abhishekhugetech # pylint: disable=W0511
    # Time required for Org to be registered
    # in the alertmanager, default 1m.
    # this will be fixed after [https://github.com/SigNoz/engineering-pod/issues/3800]
    time.sleep(65)

    # Call test API for the notification channel
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        url=signoz.self.host_configs["8080"].get("/api/v1/testChannel"),
        json={
            "name": notification_channel_name,
            "webhook_configs": [
                {
                    "send_resolved": True,
                    "url": webhook_endpoint,
                    "http_config": {},
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, (
        f"Failed to create notification channel: {response.text}"
        f"Status code: {response.status_code}"
    )

    # Verify that the alert was sent to the notification channel
    response = requests.post(
        url=notification_channel.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "POST", "url": webhook_endpoint_path},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, (
        f"Failed to get test notification count: {response.text}"
        f"Status code: {response.status_code}"
    )
    # Verify that the test notification was sent to the notification channel
    assert (
        response.json()["count"] == 1
    ), f"Expected 1 test notification, got {response.json()['count']}"
