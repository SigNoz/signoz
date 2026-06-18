# Migrating from Docker Compose to Foundry

This guide walks you through migrating an existing SigNoz deployment running via
Docker Compose to [Foundry](https://signoz.io/docs/install/docker/).

## Overview
SigNoz has developed a CLI to make installation and deployment much easier. Foundry is the evolution of how SigNoz should be installed and managed going forward.

The install script is now deprecated and will no longer receive updates.

To stay up to date on new installation platforms and patterns, please refer to [Foundry](https://github.com/SigNoz/foundry).

## Prerequisites
- [ ] Install Foundry - `curl -fsSL https://signoz.io/foundry.sh | bash`
- [ ] Generate your `casting.yaml`.

## Migration Steps
> **⚠️ Back up your docker volumes before proceeding.**

1. Make a note of the volume names used by your existing deployment for the following components:
- ClickHouse
- SigNoz
- ZooKeeper

> If you used the docker compose file we provided, the volumes will be `signoz-clickhouse`, `signoz-sqlite`, and `signoz-zookeeper-1`.

2. Generate your `casting.yaml`. Based on internal testing, the following casting should generate the manifests that mimic the [legacy docker compose](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml) setup. Once created, run `foundryctl forge -f casting.yaml`.

> [!NOTE] The casting contains `patches` to ensure that the newly generated manifests can use the existing volumes.

> [!WARNING] If your deployment had more than 1 shard or replica, you will need to adjust your manifest volumes accordingly. Additionally, if you had specific container images, you need to include them in your casting.

```yaml
apiVersion: v1alpha1
metadata:
  name: signoz
spec:
  deployment:
    flavor: compose
    mode: docker
  metastore:
    kind: sqlite
  telemetrykeeper:
    kind: zookeeper
  patches:
    - target: "deployment/compose.yaml"
      operations:
        - op: replace
          path: /volumes/dev-telemetrykeeper-0-data/name
          value: signoz-zookeeper-1
        - op: replace
          path: /volumes/dev-telemetrystore-0-0-data/name
          value: signoz-clickhouse
        - op: replace
          path: /volumes/dev-metastore-sqlite-0-data/name
          value: signoz-sqlite
        - op: add
          path: /services/dev-telemetrykeeper-zookeeper-0/user
          value: root
    - target: "deployment/telemetrystore/clickhouse/config-0-0.yaml"
      operations:
        - op: replace
          path: /macros/replica
          value: example01-01-1
        - op: replace
          path: /macros/shard
          value: "01"
```

3. Validate the manifests in `pours/deployment`. Pay special attention to `compose.yaml` — it should mimic the legacy manifest and the configuration files needed for `clickhouse`. **Do note that these are now in YAML instead of XML.**

   If you had custom settings for features like SMTP or ingestion processors/receivers, you will need to include those in your casting file.

4. Execute a `docker compose down`. **Do not** include parameters such as `--volumes` (or `-v`), as it will wipe the volumes we need to maintain and reuse to avoid data loss. **NOTE: this will generate downtime so please plan accordingly**.

5. Validate the SigNoz containers are down with `docker ps -a`. Multiple containers cannot bind the same volume.

6. Run `foundryctl cast -f casting.yaml`. This will recreate the containers based on the spec. This process will download new container images.

> [!NOTE] When `cast` is run, the migration container will execute its migrations.


## Verifying the Migration
- SigNoz containers will be up and running.
- Log in to the SigNoz UI and verify that data is present.
- Validate that your data ingestion is receiving data.
- Review the logs from both ClickHouse and ZooKeeper; no errors should be present.

## Rolling Back
- If you need to roll back, stop and remove the containers created by Foundry.
- Reapply your docker compose file.

## Troubleshooting
- Please reach out to our community on [Slack](https://signoz.io/slack).

## References
- [SigNoz Docker installation docs](https://signoz.io/docs/install/docker/)
- [SigNoz documentation](https://signoz.io/docs)
- [Foundry](https://github.com/SigNoz/foundry)
