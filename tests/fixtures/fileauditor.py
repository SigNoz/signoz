import json
import time

import docker

from fixtures import types

AUDIT_FILE_PATH = "/tmp/audit.log"


def list_audit_events(signoz: types.SigNoz) -> list[dict]:
    """Each line of the audit file is one OTLP JSON batch of events; this flattens all batches into events."""
    exit_code, output = docker.from_env().containers.get(signoz.self.id).exec_run(["cat", AUDIT_FILE_PATH])
    assert exit_code == 0, output.decode()

    events = []
    for line in output.decode().splitlines():
        for resource_logs in json.loads(line)["resourceLogs"]:
            resource = _attributes(resource_logs["resource"]["attributes"])
            for scope_logs in resource_logs["scopeLogs"]:
                for log_record in scope_logs["logRecords"]:
                    events.append(
                        {
                            "event_name": log_record["eventName"],
                            "severity_text": log_record["severityText"],
                            "body": log_record["body"]["stringValue"],
                            "scope_name": scope_logs["scope"]["name"],
                            "resource": resource,
                            "attributes": _attributes(log_record["attributes"]),
                        }
                    )

    return events


def wait_for_audit_event(signoz: types.SigNoz, event_name: str, resource_id: str, target_id: str | None = None, wait_seconds: int = 10) -> dict:
    deadline = time.time() + wait_seconds
    events = []
    while time.time() < deadline:
        events = list_audit_events(signoz)
        matched = [event for event in events if event["event_name"] == event_name and event["resource"].get("signoz.resource.id") == resource_id and (target_id is None or event["attributes"].get("signoz.resource.target.id") == target_id)]
        if len(matched) > 0:
            return matched[0]
        time.sleep(0.5)

    raise AssertionError(f"No {event_name} audit event for resource {resource_id} (target {target_id}) within {wait_seconds}s, events: {events}")


def _attributes(otlp_attributes: list[dict]) -> dict:
    # OTLP JSON encodes int64 values as decimal strings.
    return {attribute["key"]: int(attribute["value"]["intValue"]) if "intValue" in attribute["value"] else attribute["value"]["stringValue"] for attribute in otlp_attributes}
