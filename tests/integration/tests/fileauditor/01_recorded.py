import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, find_user_by_email
from fixtures.fileauditor import wait_for_audit_event
from fixtures.savedview import SAVED_VIEW_BASE, create_saved_view
from fixtures.serviceaccount import SERVICE_ACCOUNT_BASE, create_service_account, create_service_account_with_key, delete_service_account, get_first_key_id


def test_create_saved_view_writes_create_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    admin = find_user_by_email(signoz, token, USER_ADMIN_EMAIL)

    view_id = create_saved_view(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")

    event = wait_for_audit_event(signoz, "signoz.audit.create", view_id)
    assert event["severity_text"] == "INFO"
    assert event["scope_name"] == "signoz.audit"
    assert event["resource"]["service.name"] == "signoz"
    assert event["resource"]["signoz.resource.kind"] == "saved-view"
    assert event["attributes"]["signoz.audit.verb"] == "create"
    assert event["attributes"]["signoz.audit.outcome"] == "success"
    assert event["attributes"]["signoz.principal.id"] == admin["id"]
    assert event["attributes"]["signoz.principal.email"] == USER_ADMIN_EMAIL
    assert event["attributes"]["signoz.organization.id"] == admin["orgId"]
    assert event["attributes"]["http.request.method"] == "POST"
    assert event["attributes"]["http.route"] == "/api/v2/saved_views"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.CREATED


def test_update_service_account_writes_update_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"),
        json={"name": f"fileauditor-{uuid.uuid4().hex[:8]}"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    event = wait_for_audit_event(signoz, "signoz.audit.update", service_account_id)
    assert event["resource"]["signoz.resource.kind"] == "serviceaccount"
    assert event["attributes"]["signoz.audit.verb"] == "update"
    assert event["attributes"]["signoz.audit.outcome"] == "success"
    assert event["attributes"]["http.route"] == "/api/v1/service_accounts/{id}"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.NO_CONTENT


def test_delete_service_account_writes_delete_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")

    delete_service_account(signoz, token, service_account_id)

    event = wait_for_audit_event(signoz, "signoz.audit.delete", service_account_id)
    assert event["resource"]["signoz.resource.kind"] == "serviceaccount"
    assert event["attributes"]["signoz.audit.verb"] == "delete"
    assert event["attributes"]["signoz.audit.outcome"] == "success"
    assert event["attributes"]["http.route"] == "/api/v1/service_accounts/{id}"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.NO_CONTENT


def test_create_service_account_key_writes_attach_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"),
        json={"name": "fileauditor", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    key_id = response.json()["data"]["id"]

    event = wait_for_audit_event(signoz, "signoz.audit.attach", service_account_id, target_id=key_id)
    assert event["resource"]["signoz.resource.kind"] == "serviceaccount"
    assert event["attributes"]["signoz.resource.target.kind"] == "factor-api-key"
    assert event["attributes"]["signoz.audit.verb"] == "attach"
    assert event["attributes"]["signoz.audit.outcome"] == "success"
    assert event["attributes"]["http.route"] == "/api/v1/service_accounts/{id}/keys"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.CREATED


def test_revoke_service_account_key_writes_detach_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id, _ = create_service_account_with_key(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")
    key_id = get_first_key_id(signoz, token, service_account_id)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys/{key_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    event = wait_for_audit_event(signoz, "signoz.audit.detach", service_account_id, target_id=key_id)
    assert event["resource"]["signoz.resource.kind"] == "serviceaccount"
    assert event["attributes"]["signoz.resource.target.kind"] == "factor-api-key"
    assert event["attributes"]["signoz.audit.verb"] == "detach"
    assert event["attributes"]["signoz.audit.outcome"] == "success"
    assert event["attributes"]["http.route"] == "/api/v1/service_accounts/{id}/keys/{fid}"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.NO_CONTENT


def test_delete_missing_saved_view_writes_failure_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    missing_view_id = str(uuid.uuid4())

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{missing_view_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text

    event = wait_for_audit_event(signoz, "signoz.audit.delete", missing_view_id)
    assert event["severity_text"] == "ERROR"
    assert event["attributes"]["signoz.audit.outcome"] == "failure"
    assert event["attributes"]["exception.type"] == "not-found"
    assert event["attributes"]["http.response.status_code"] == HTTPStatus.NOT_FOUND
