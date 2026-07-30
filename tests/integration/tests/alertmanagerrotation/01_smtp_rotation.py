import json
import time
import uuid
from collections.abc import Callable
from http import HTTPStatus

import docker
import pytest
import requests
from sqlalchemy import text
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, token_getter
from fixtures.logger import setup_logger
from fixtures.maildev import (
    NEW_PROVIDER_SMTP_PASS,
    SMTP_TEST_FROM,
    delete_all_mails,
    get_all_mails,
    signoz_smtp_env,
    verify_email_received,
)
from fixtures.notification_channel import EMAIL_TRANSPORT_KEYS, send_test_notification
from fixtures.signoz import create_signoz

logger = setup_logger(__name__)

LEGACY_SMTP_SECRET = "legacy-smtp-secret"
LEGACY_SMARTHOST = "email-smtp.us-east-1.amazonaws.com:587"


def wait_for_email(maildev: types.TestContainerDocker, filters: dict, wait_seconds: int = 30) -> None:
    deadline = time.time() + wait_seconds
    while time.time() < deadline:
        if verify_email_received(maildev, filters):
            return
        time.sleep(1)
    raise AssertionError(f"no email matching {filters} within {wait_seconds}s, inbox: {get_all_mails(maildev)}")


def stamp_legacy_transport(sqlstore: types.TestContainerSQL, channel_name: str) -> None:
    legacy_transport = {
        "from": "legacy@integration.test",
        "hello": "localhost",
        "smarthost": LEGACY_SMARTHOST,
        "auth_username": "AKIA000LEGACY",
        "auth_password": LEGACY_SMTP_SECRET,
        "require_tls": True,
    }

    with sqlstore.conn.connect() as conn:
        data = conn.execute(text("SELECT data FROM notification_channel WHERE name = :name"), {"name": channel_name}).fetchone()[0]
        receiver = json.loads(data)
        receiver["email_configs"][0].update(legacy_transport)
        conn.execute(
            text("UPDATE notification_channel SET data = :data WHERE name = :name"),
            {"data": json.dumps(receiver), "name": channel_name},
        )

        rows = conn.execute(text("SELECT id, config FROM alertmanager_config")).fetchall()
        assert len(rows) == 1
        config_id, config_raw = rows[0]
        config = json.loads(config_raw)
        config.setdefault("global", {}).update(
            {
                "smtp_from": "legacy@integration.test",
                "smtp_hello": "localhost",
                "smtp_smarthost": LEGACY_SMARTHOST,
                "smtp_auth_username": "AKIA000LEGACY",
                "smtp_auth_password": LEGACY_SMTP_SECRET,
                "smtp_require_tls": True,
            }
        )
        for rcv in config.get("receivers", []):
            if rcv.get("name") == channel_name:
                rcv["email_configs"][0].update(legacy_transport)
        conn.execute(
            text("UPDATE alertmanager_config SET config = :config WHERE id = :id"),
            {"config": json.dumps(config), "id": config_id},
        )

        deleted = conn.execute(text("DELETE FROM migration WHERE name IN ('106', '106_scrub_email_channel_transport')"))
        assert deleted.rowcount == 1, "expected exactly one scrub migration record"

        conn.commit()


def assert_stored_channel_clean(sqlstore: types.TestContainerSQL, channel_name: str, recipient: str) -> None:
    with sqlstore.conn.connect() as conn:
        data = conn.execute(text("SELECT data FROM notification_channel WHERE name = :name"), {"name": channel_name}).fetchone()[0]
        receiver = json.loads(data)
        email_config = receiver["email_configs"][0]
        assert email_config["to"] == recipient
        transport_keys = set(email_config.keys()) & set(EMAIL_TRANSPORT_KEYS)
        assert not transport_keys, f"stored channel carries transport keys {transport_keys}: {data}"
        assert LEGACY_SMTP_SECRET not in data

        config_raw = conn.execute(text("SELECT config FROM alertmanager_config")).fetchone()[0]
        assert LEGACY_SMTP_SECRET not in config_raw
        assert LEGACY_SMARTHOST not in config_raw
        assert NEW_PROVIDER_SMTP_PASS not in config_raw


def test_smtp_rotation_applies_to_existing_channels(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    maildev_old: types.TestContainerDocker,
    maildev_new: types.TestContainerDocker,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    channel_name = f"rotation-{uuid.uuid4()}"
    recipient = f"rotation-{uuid.uuid4()}@integration.test"

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": channel_name, "email_configs": [{"to": recipient}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    delete_all_mails(maildev_old)
    recipient_old_probe = f"probe-old-{uuid.uuid4()}@integration.test"
    send_test_notification(signoz, token, {"name": f"probe-{uuid.uuid4()}", "email_configs": [{"to": recipient_old_probe}]})
    wait_for_email(maildev_old, {"to": recipient_old_probe, "from": SMTP_TEST_FROM})
    logger.info("Delivery through the old provider verified")

    docker.from_env().containers.get(signoz.self.id).stop()
    logger.info("Stopped signoz running against the old provider")

    stamp_legacy_transport(sqlstore, channel_name)

    signoz_new = create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_smtp_rotation_new",
        env_overrides=signoz_smtp_env(maildev_new, password=NEW_PROVIDER_SMTP_PASS),
    )
    token_new = token_getter(signoz_new)(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    assert_stored_channel_clean(sqlstore, channel_name, recipient)
    with sqlstore.conn.connect() as conn:
        replayed = conn.execute(text("SELECT count(*) FROM migration WHERE name IN ('106', '106_scrub_email_channel_transport')")).fetchone()[0]
        assert replayed == 1

    response = requests.get(
        signoz_new.self.host_configs["8080"].get("/api/v1/channels"),
        headers={"Authorization": f"Bearer {token_new}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    listed = {channel["name"]: channel for channel in response.json()["data"]}
    assert channel_name in listed
    assert LEGACY_SMTP_SECRET not in listed[channel_name]["data"]
    assert LEGACY_SMARTHOST not in listed[channel_name]["data"]

    delete_all_mails(maildev_new)
    mails_at_old_provider = len(get_all_mails(maildev_old))
    recipient_new_probe = f"probe-new-{uuid.uuid4()}@integration.test"
    send_test_notification(signoz_new, token_new, {"name": f"probe-{uuid.uuid4()}", "email_configs": [{"to": recipient_new_probe}]})
    wait_for_email(maildev_new, {"to": recipient_new_probe, "from": SMTP_TEST_FROM})
    assert len(get_all_mails(maildev_old)) == mails_at_old_provider, "old provider must receive nothing after rotation"
