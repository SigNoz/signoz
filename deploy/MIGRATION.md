# Migrating from the install script and `deploy/` to Foundry

The install script (`install.sh`) and the bundled Compose and Swarm files
under `deploy/` are deprecated in favor of [Foundry][foundry], the supported
way to install and manage SigNoz. This guide moves an existing Docker Compose
or Docker Swarm deployment to Foundry and reattaches your existing volumes, so
your data is preserved.

> [!IMPORTANT]
> This guide is only for **existing** `install.sh` / `deploy/` deployments.
> Setting up SigNoz for the first time? Skip migration and install Foundry
> directly: [SigNoz install docs][install-docs].

## How it works

Foundry splits a deployment into two commands:

- `foundryctl forge` generates the deployment manifests from a `casting.yaml`.
  It never touches running containers, so it is safe to re-run while you
  iterate.
- `foundryctl cast` applies those manifests: it (re)creates the containers and
  reuses the volumes you point it at.

You write one `casting.yaml`, point a few patches at your existing data
volumes, then cast. The steps below are the same for Compose and Swarm; they
differ only in the casting (step 3) and how you stop the old stack (step 5).

## Prerequisites

- An existing SigNoz deployment from `install.sh` or `deploy/` (Compose or
  Swarm).
- `foundryctl` (installed in step 1).

## Migrate

### 1. Install Foundry

```bash
curl -fsSL https://signoz.io/foundry.sh | bash
```

### 2. Keep your rollback path

This migration reattaches your existing volumes in place; it does not move or
delete your data. The only destructive action is passing `--volumes` / `-v`
when you stop the old stack (step 5), so avoid that flag.

> [!IMPORTANT]
> Keep a copy of your existing `docker-compose.yaml` / stack file (and any
> config it references). SigNoz no longer distributes these files, so this copy
> is your only way to roll back.

### 3. Write your `casting.yaml`

Use the casting for your deployment. Both reproduce the legacy single-node
setup (ClickHouse + ZooKeeper + SQLite) and reattach your existing volumes;
they differ only in `spec.deployment.flavor` and the volume-reuse patch
(Compose volumes have a `name` to replace; Swarm volumes are bare, so the whole
entry is replaced). If your deployment ran more than one shard or replica,
adjust the volume patches accordingly. The
[Docker Compose example][compose-example] is a useful reference.

> [!IMPORTANT]
> The `replica` and `shard` macros are placeholders. Replace them with the
> values from your existing ClickHouse config (the `macros` section of
> `config.xml` / `metrika.xml`), or the generated manifests will not match your
> existing data.

<details>
<summary><b>Docker Compose</b> casting.yaml</summary>

```yaml
# casting.yaml
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
              replica: "example01-01-1" # replace with your replica macro
              shard: "01" # replace with your shard macro
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

</details>

<details>
<summary><b>Docker Swarm</b> casting.yaml</summary>

```yaml
# casting.yaml
apiVersion: v1alpha1
kind: Installation
metadata:
  name: signoz
spec:
  deployment:
    flavor: swarm
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
              replica: "example01-01-1" # replace with your replica macro
              shard: "01" # replace with your shard macro
  patches:
    - target: "deployment/compose.yaml"
      operations:
        - op: replace
          path: /volumes/signoz-telemetrykeeper-0-data
          value:
            name: signoz-zookeeper-1
        - op: replace
          path: /volumes/signoz-telemetrystore-0-0-data
          value:
            name: signoz-clickhouse
        - op: replace
          path: /volumes/signoz-metastore-sqlite-0-data
          value:
            name: signoz-sqlite
        - op: add
          path: /services/signoz-telemetrykeeper-zookeeper-0/user
          value: root
```

</details>

> [!NOTE]
> The `user: root` patch on the ZooKeeper service lets the container read and
> write the data in your reused ZooKeeper volume, whose files the legacy setup
> created as `root`. Without it, ZooKeeper may fail to start with permission
> errors.

If you had custom configuration (SMTP, extra ingestion receivers/processors,
or custom ClickHouse settings), carry it over via [patches][patches],
[custom config files][custom-config], or [environment variables][env-vars].

### 4. Generate and review the manifests

```bash
foundryctl forge -f casting.yaml
```

Review `pours/deployment/` before deploying:

- [ ] Container images match your current deployment. Foundry generates with
  `latest` by default; if your SigNoz version was older than latest, check the
  [upgrade path][upgrade-path] first.
- [ ] The generated manifests match your previous configuration, especially
  `compose.yaml` (the new entry point for your deployment).
- [ ] The ClickHouse config is now YAML rather than XML; confirm your custom
  settings carried over (see [ClickHouse configuration files][ch-config] for
  the XML-to-YAML mapping).

### 5. Stop the old deployment

Use the command for your deployment. Do **not** pass `--volumes` / `-v`; that
would delete the data you are migrating.

```bash
docker compose down        # Compose
docker stack rm signoz     # Swarm
```

> [!NOTE]
> This causes downtime, so plan accordingly.

Confirm nothing is still bound to the volumes before continuing:

```bash
docker ps -a
```

### 6. Deploy with Foundry

```bash
foundryctl cast -f casting.yaml
```

This recreates the containers against your existing volumes and pulls the
images. The migration container runs the schema migrations as part of `cast`.

**Prefer not to use `cast`?** The manifests in `pours/deployment/` are standard
Docker artifacts you can apply yourself. Run the command from that directory so
the relative config paths resolve:

```bash
cd pours/deployment
docker compose up -d                        # Compose
docker stack deploy -c compose.yaml signoz  # Swarm
```

## Verify

- All SigNoz containers are running.
- The UI is reachable on `http://localhost:8080`, and OTLP on `4317` (gRPC)
  and `4318` (HTTP), so already-instrumented apps and saved bookmarks keep
  working.
- Your existing data is present in the UI, and new data is being ingested.
- ClickHouse and ZooKeeper logs show no errors.

## Roll back

Step 5 left your volumes untouched, so your data is intact. To return to the
previous setup:

1. Bring down the Foundry deployment (`docker compose down` or
   `docker stack rm signoz`, again without `-v`).
2. Confirm the containers are gone with `docker ps -a`.
3. Re-apply your backed-up stack: `docker compose up -d` (Compose) or
   `docker stack deploy -c docker-compose.yaml signoz` (Swarm). It reattaches
   the same volumes and restores your prior state.

## Troubleshooting

If the migration runs into trouble, reach out on [Slack][slack] or open a
[Foundry issue][foundry-issues].

## References

- [Foundry][foundry]
- [Casting file reference][casting-ref]
- [Custom config files][custom-config]
- [Patches][patches]
- [SigNoz documentation][signoz-docs]

[foundry]: https://github.com/SigNoz/foundry
[install-docs]: https://signoz.io/docs/install/
[compose-example]: https://github.com/SigNoz/foundry/tree/main/docs/examples/docker/compose
[patches]: https://github.com/SigNoz/foundry/blob/main/docs/concepts/patches.md
[custom-config]: https://github.com/SigNoz/foundry/blob/main/docs/concepts/moldings.md#custom-config-files
[env-vars]: https://github.com/SigNoz/foundry/blob/main/docs/reference/casting-file.md#molding-spec
[casting-ref]: https://github.com/SigNoz/foundry/blob/main/docs/reference/casting-file.md
[ch-config]: https://clickhouse.com/docs/operations/configuration-files
[upgrade-path]: https://signoz.io/docs/operate/upgrade/
[slack]: https://signoz.io/slack
[foundry-issues]: https://github.com/SigNoz/foundry/issues
[signoz-docs]: https://signoz.io/docs
