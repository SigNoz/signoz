# Migrating from the install script to Foundry

> [!IMPORTANT]
> The install script is now deprecated and will no longer receive updates.

This guide walks you through migrating an existing SigNoz deployment running via
Docker Compose to [Foundry](https://signoz.io/docs/install/docker/).

> [!NOTE]
> Setting up SigNoz for the first time? You don't need this guide — follow the [SigNoz installation docs](https://signoz.io/docs/install/) instead.

## Overview
To stay up to date on new installation platforms and patterns, please refer to [Foundry](https://github.com/SigNoz/foundry).

Two `foundryctl` commands are used throughout this guide:
- **`forge`** — generates deployment manifests from your `casting.yaml`. It does not touch running containers, so it is safe to re-run while you iterate.
- **`cast`** — applies the generated manifests: it creates and starts the containers (and pulls new images).

## Prerequisites
- [ ] Install Foundry - `curl -fsSL https://signoz.io/foundry.sh | bash`

## Migration Steps
> [!WARNING]
> **Before proceeding, back up both:**
> - **Your docker volumes** — these hold your data.
> - **Your existing `docker-compose.yaml` (and any config it references)** — keep a copy somewhere safe. The compose manifests are no longer distributed by SigNoz, so this backup is your only way to roll back to your previous setup.

1. Make a note of the volume names used by your existing deployment for the following components:
- ClickHouse
- SigNoz
- ZooKeeper

> If you used the docker compose file we provided, the volumes will be `signoz-clickhouse`, `signoz-sqlite`, and `signoz-zookeeper-1`.

2. Generate your `casting.yaml`. Based on internal testing, the following casting should generate the manifests that mimic the legacy docker compose setup (compare against your backed-up `docker-compose.yaml`). Once created, run `foundryctl forge -f casting.yaml`.

Foundry has a [Docker Compose example](https://github.com/SigNoz/foundry/tree/main/docs/examples/docker/compose). Please use it as a reference.

> [!WARNING]
> If your deployment had more than 1 shard or replica, you will need to adjust your manifest volumes accordingly.

> [!IMPORTANT]
> The `replica` and `shard` macros below are placeholders. Replace them with the values from your existing ClickHouse configuration (check the `macros` section of your current ClickHouse config, e.g. `config.xml`/`metrika.xml`), otherwise the generated manifests will not match your existing data.

```yaml
apiVersion: v1alpha1
kind: Installation
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
  telemetrystore:
    spec:
      config:
        data:
          config-0-0.yaml: |
            macros:
              replica: "example01-01-1" # replace with your existing ClickHouse replica macro (see legacy configuration files for reference)
              shard: "01"               # replace with your existing ClickHouse shard macro (see legacy configuration files for reference)
  patches:
    - target: "deployment/compose.yaml"
      operations:
        - op: replace
          path: /volumes/signoz-telemetrykeeper-0-data/name
          value: signoz-zookeeper-1
        - op: replace
          path: /volumes/signoz-telemetrystore-0-0-data/name
          value: signoz-clickhouse
        - op: replace
          path: /volumes/signoz-metastore-sqlite-0-data/name
          value: signoz-sqlite
        - op: add
          path: /services/signoz-telemetrykeeper-zookeeper-0/user
          value: root
```

> [!NOTE]
> The `user: root` patch on the ZooKeeper service is required so the container can read/write the data in your reused ZooKeeper volume, which was created with `root`-owned files by the legacy compose setup. Without it, ZooKeeper may fail to start with permission errors.

If you had custom configurations for features like SMTP or additional ingestion processors/receivers, you will need to include those in your casting file via [patches](https://github.com/SigNoz/foundry/blob/main/docs/concepts/patches.md), [custom configuration](https://github.com/SigNoz/foundry/blob/main/docs/concepts/moldings.md#custom-config-files) or [environment variables](https://github.com/SigNoz/foundry/blob/main/docs/reference/casting-file.md#molding-spec) based on your previous configuration.

3. Review your manifests, we suggest executing the following checks on your manifests before proceeding:
- [ ] Validate the container images match what your deployment had, Foundry uses `latest` on generation by default.
- [ ] If your signoz version was older than latest, please check the [upgrade path](https://signoz.io/docs/operate/upgrade/) first.
- [ ] Check the produced manifests in `pours/deployment` match your older configurations. Extra consideration and review needs to be done on `compose.yaml` as this will be the main entry point for your new deployment.
- [ ] The configuration files for clickhouse are now in YAML so validate your custom settings are present.

4. Execute a `docker compose down`. **Do not** include parameters such as `--volumes` (or `-v`), as it will wipe the volumes we need to maintain and reuse to avoid data loss. 

> [!NOTE]
> This will generate downtime so please plan accordingly.

5. Validate the SigNoz containers are down with `docker ps -a`. Multiple containers cannot bind the same volume.

6. Run `foundryctl cast -f casting.yaml`. This will recreate the containers based on the spec. This process will download new container images.

> [!NOTE]
> When `cast` is run, the migration container will execute its migrations.

## Verifying the Migration
- SigNoz containers will be up and running.
- Log in to the SigNoz UI and verify that data is present.
    - Signoz will run on localhost:8080
- Validate that your data ingestion is receiving data.
    - Ingesters will receive data on localhost:4317(grpc) and localhost:4318(http)
- Review the logs from both ClickHouse and ZooKeeper; no errors should be present.

## Rolling Back
Because step 4 brought the legacy stack down *without* `-v`, your original volumes
are untouched and still hold your data. To roll back:

- Stop and remove the containers created by Foundry (`docker compose down`, again without `-v`).
- Confirm the containers are gone with `docker ps -a` so nothing else is bound to the volumes.
- Reapply your original docker compose file (`docker compose up -d`). It will reattach to the
  existing volumes and restore your prior state.

## Troubleshooting
- Please reach out to our community on [Slack](https://signoz.io/slack).

## References
- [SigNoz Docker installation docs](https://signoz.io/docs/install/docker/)
- [SigNoz documentation](https://signoz.io/docs)
- [Foundry](https://github.com/SigNoz/foundry)
