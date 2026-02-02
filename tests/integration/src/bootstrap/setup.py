from http import HTTPStatus

import numpy as np
import requests

from fixtures import types


def test_setup(signoz: types.SigNoz) -> None:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2
    )

    assert response.status_code == HTTPStatus.OK


def test_telemetry_databases_exist(signoz: types.SigNoz) -> None:
    arr: np.ndarray = signoz.telemetrystore.conn.query_np("SHOW DATABASES")
    databases = arr.tolist() if arr.size > 0 else []
    required_databases = [
        "signoz_metrics",
        "signoz_logs",
        "signoz_traces",
        "signoz_metadata",
        "signoz_analytics",
        "signoz_meter",
    ]

    for db_name in required_databases:
        assert any(
            db_name in str(db) for db in databases
        ), f"Database {db_name} not found"


def test_teardown(
    signoz: types.SigNoz,  # pylint: disable=unused-argument
    idp: types.TestContainerIDP,  # pylint: disable=unused-argument
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    migrator: types.Operation,  # pylint: disable=unused-argument
) -> None:
    pass
