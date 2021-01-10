# Query Service

Query service is the interface between forntend and databases. It is written in **Golang**. It will have modules for all supported databases. Query service is responsible to:
- parse the request from Frontend
- create relevant Druid queries (and all other supported database queries)
- parse response from databases and handle error if any
- build response in the format accepted by Frontend


#### Druid Queries
Internally we use both native and sql queries to Druid.

#### Configuration
Query Service needs below `env` variables to run:
```
    DruidClientUrl: http://signoz-druid-router:8888
    DruidDatasource: flattened_spans
```
The above values are the default ones used by SigNoz and are kept at `deploy/kubernetes/platform/signoz-charts/query-service/values.yaml`

#### Build and Run locally
```console
cd pkg/query-service
go build -o build/query-service main.go
DruidClientUrl=xxxx DruidDatasource=flattened_spans build/query-service
```

#### Docker Images
The docker images of query-service is available at https://hub.docker.com/r/signoz/query-service