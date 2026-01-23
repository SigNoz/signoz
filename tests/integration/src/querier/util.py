from http import HTTPStatus

import requests


def assert_identical_query_response(
    response1: requests.Response, response2: requests.Response
) -> None:
    """
    Assert that two query responses are identical in status and data.
    """
    assert response1.status_code == response2.status_code, "Status codes do not match"
    if response1.status_code == HTTPStatus.OK:
        assert (
            response1.json()["status"] == response2.json()["status"]
        ), "Response statuses do not match"
        assert (
            response1.json()["data"]["data"]["results"]
            == response2.json()["data"]["data"]["results"]
        ), "Response data do not match"
