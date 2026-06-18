# Deploy

Check that you have cloned [signoz/signoz](https://github.com/signoz/signoz)
and currently are in `signoz/deploy` folder.

## Docker

If you don't have docker set up, please follow [this guide](https://docs.docker.com/engine/install/)
to set up docker before proceeding with the next steps.

> **Note:** The `install.sh` script has been deprecated and is no longer maintained.
> SigNoz now installs and runs through [Foundry](https://signoz.io/docs/install/docker/).
> Please follow the latest installation instructions at
> [signoz.io/docs/install/docker](https://signoz.io/docs/install/docker/).
>
> Already running SigNoz via Docker Compose? See the [Migration Guide](./MIGRATION.md)
> to transition your existing deployment to Foundry.

### Using Docker Compose

If you don't have docker compose set up, please follow [this guide](https://docs.docker.com/compose/install/)
to set up docker compose before proceeding with the next steps.

```sh
cd deploy/docker
docker compose up -d
```

Open http://localhost:8080 in your favourite browser.

To start collecting logs and metrics from your infrastructure, run the following command:

```sh
cd generator/infra
docker compose up -d
```

To start generating sample traces, run the following command:

```sh
cd generator/hotrod
docker compose up -d
```

In a couple of minutes, you should see the data generated from hotrod in SigNoz UI.

For more details, please refer to the [SigNoz documentation](https://signoz.io/docs/install/docker/).

## Docker Swarm

To install SigNoz using Docker Swarm, run the following command:

```sh
cd deploy/docker-swarm
docker stack deploy -c docker-compose.yaml signoz
```

Open http://localhost:8080 in your favourite browser.

To start collecting logs and metrics from your infrastructure, run the following command:

```sh
cd generator/infra
docker stack deploy -c docker-compose.yaml infra
```

To start generating sample traces, run the following command:

```sh
cd generator/hotrod
docker stack deploy -c docker-compose.yaml hotrod
```

In a couple of minutes, you should see the data generated from hotrod in SigNoz UI.

For more details, please refer to the [SigNoz documentation](https://signoz.io/docs/install/docker-swarm/).

## Uninstall/Troubleshoot?

Go to our official documentation site [signoz.io/docs](https://signoz.io/docs) for more.

