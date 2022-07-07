# Query Service

Query service is the interface between frontend and databases. It is written in **Golang**. It will have modules for all supported databases. Query service is responsible to:
- parse the request from Frontend
- create relevant Clickhouse queries (and all other supported database queries)
- parse response from databases and handle error if any
- clickhouse response in the format accepted by Frontend


#### Configuration
- Open ./constants/constants.go
    - Replace ```const RELATIONAL_DATASOURCE_PATH = "/var/lib/signoz/signoz.db"``` \
        with ```const RELATIONAL_DATASOURCE_PATH = "./signoz.db".```

- Query Service needs below `env` variables to run:

```
    ClickHouseUrl=tcp://localhost:9001
    STORAGE=clickhouse
```

<!-- The above values are the default ones used by SigNoz and are kept at `deploy/kubernetes/platform/signoz-charts/query-service/values.yaml` -->

#### Build and Run locally
```console
cd pkg/query-service
go build -o build/query-service main.go
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse build/query-service
```

#### Docker Images
The docker images of query-service is available at https://hub.docker.com/r/signoz/query-service
