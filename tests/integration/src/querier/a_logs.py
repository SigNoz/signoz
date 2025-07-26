import time
from datetime import datetime, timezone
from typing import Callable, List

from fixtures import types
from fixtures.logs import Logs


def test_logs(
    signoz: types.SigNoz,
    create_user_admin: None,
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=timezone.utc),
                resources={
                    "cloud.provider": "gcp",
                    "cloud.account.id": "signoz-staging",
                    "cloud.platform": "gcp_kubernetes_engine",
                    "k8s.cluster.name": "mgmt",
                    "k8s.namespace.name": "generator",
                    "service.name": "consumer-svc-2",
                    "deployment.environment": "mq-kafka",
                    "service.instance.id": "11896892-d0ab-403e-9de2-4b820e1bdca3",
                },
                attributes={"message": "Hello, world!"},
                body="Hello, world!",
                severity_text="INFO",
            )
        ]
    )

    time.sleep(100)
