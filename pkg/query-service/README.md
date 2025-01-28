# Query Service

Query service is the interface between frontend and databases. It is written in **Golang**. It will have modules for all supported databases. Query service is responsible to:
- parse the request from Frontend
- create relevant Clickhouse queries (and all other supported database queries)
- parse response from databases and handle error if any
- clickhouse response in the format accepted by Frontend

# Complete the clickhouse setup locally.
https://github.com/SigNoz/signoz/blob/main/CONTRIBUTING.md#42-to-run-clickhouse-setup-recommended-for-local-development

- Comment out the query-service and the frontend section in `signoz/deploy/docker/docker-compose.yaml`
- Change the alertmanager section in `signoz/deploy/docker/docker-compose.yaml` as follows:
```console
alertmanager:
    image: signoz/alertmanager:0.23.7
    volumes:
      - ./data/alertmanager:/data
    expose:
      - "9093"
    ports:
      - "8080:9093"
    # depends_on:
    #   query-service:
    #     condition: service_healthy
    restart: on-failure
    command:
      - --queryService.url=http://172.17.0.1:8085
      - --storage.path=/data
```
- Run the following:
```console
cd deploy/docker
docker compose up -d
```

#### Backend Configuration

- Open ./constants/constants.go
    - Replace ```const RELATIONAL_DATASOURCE_PATH = "/var/lib/signoz/signoz.db"``` \
        with ```const RELATIONAL_DATASOURCE_PATH = "./signoz.db".```

- Query Service needs below `env` variables to run:

```
    export ClickHouseUrl=tcp://localhost:9001
    export STORAGE=clickhouse
    export ALERTMANAGER_API_PREFIX=http://localhost:9093/api/
```

<!-- The above values are the default ones used by SigNoz and are kept at `deploy/kubernetes/platform/signoz-charts/query-service/values.yaml` -->

#### Build and Run locally
```console
cd pkg/query-service
go build -o build/query-service main.go
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse build/query-service --prefer-delta=true 
```

# Frontend Configuration for local query-service.

- Set the following environment variables
```console
export FRONTEND_API_ENDPOINT=http://localhost:8080
```

- Run the following 
```console
cd signoz\frontend\
yarn install
yarn dev
```

## Note:
If you use go version 1.18 for development and contributions, then please checkout the following issue.
https://github.com/SigNoz/signoz/issues/1371


#### Docker Images
The docker images of query-service is available at https://hub.docker.com/r/signoz/query-service
