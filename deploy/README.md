# Deploy

Check that you have cloned [signoz/signoz](https://github.com/signoz/signoz)
and currently are in `signoz/deploy` folder.

## Docker

If you don't have docker set up, please follow [this guide](https://docs.docker.com/engine/install/)
to set up docker before proceeding with the next steps.

### Using Install Script

Now run the following command to install:

```sh
./install.sh
```

### Using Docker Compose

If you don't have docker compose set up, please follow [this guide](https://docs.docker.com/compose/install/)
to set up docker compose before proceeding with the next steps.

```sh
cd deploy/docker
docker compose up -d
```

Open http://localhost:8080 in your favourite browser.

### Custom Port Configuration

You can customize the ports used by SigNoz by setting the following environment variables:

- `SIGNOZ_PORT` - Port for the SigNoz UI and API (default: 8080)
- `OTEL_GRPC_PORT` - Port for OTLP gRPC receiver (default: 4317)
- `OTEL_HTTP_PORT` - Port for OTLP HTTP receiver (default: 4318)

**Example using Docker Compose:**

```sh
cd deploy/docker
SIGNOZ_PORT=9090 OTEL_GRPC_PORT=5317 OTEL_HTTP_PORT=5318 docker compose up -d
```

**Example using Install Script:**

```sh
export SIGNOZ_PORT=9090
export OTEL_GRPC_PORT=5317
export OTEL_HTTP_PORT=5318
./install.sh
```

After setting custom ports, access SigNoz UI at `http://localhost:<SIGNOZ_PORT>`.

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
