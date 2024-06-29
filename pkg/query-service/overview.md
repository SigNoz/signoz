# Query Service Overview

The Query Service is a Golang-based interface between the frontend and various databases, primarily ClickHouse. It is designed to handle requests from the frontend, generate appropriate database queries, process the responses, and return the data in a format that the frontend can use.

## Key Responsibilities
- **Request Parsing**: It parses incoming requests from the frontend.
- **Query Generation**: It generates ClickHouse queries (and queries for other supported databases).
- **Response Handling**: It processes the responses from the databases, handling any errors that occur.
- **Data Formatting**: It formats the database responses to be compatible with the frontend requirements.

## Setup and Configuration
- **Local Setup**: Instructions for setting up ClickHouse locally are provided, including modifying Docker Compose files and running specific commands to start the services.
- **Environment Variables**: Several environment variables need to be set for the Query Service to function correctly, such as `ClickHouseUrl`, `STORAGE`, and `ALERTMANAGER_API_PREFIX`.

## Building and Running
- **Building**: The service can be built using Go commands.
- **Running**: The service can be run locally with specific environment variables and command-line options.

## Docker Integration
- **Dockerfile**: A minimal Alpine-based Dockerfile is used to build the Query Service container.
- **Docker Compose**: The service is configured to run in a Docker Compose setup, with dependencies on other services like ClickHouse and AlertManager.

## API Endpoints
The Query Service exposes several API endpoints to interact with the frontend:
- **Service Overview**: Provides an overview of services.
- **Top-Level Operations**: Retrieves top-level operations for services.
- **Service List**: Fetches a list of services.
- **Dependency Graph**: Generates a dependency graph of services.

## SQL Queries
The service uses complex SQL queries to fetch and aggregate data from ClickHouse. These queries include subqueries for calculating metrics like p99 latency, RPS (requests per second), and error rates.

## Code References
- **README.md**: Provides detailed setup instructions and environment variable configurations.
```
# Query Service

Query service is the interface between frontend and databases. It is written in **Golang**. It will have modules for all supported databases. Query service is responsible to:
- parse the request from Frontend
- create relevant Clickhouse queries (and all other supported database queries)
- parse response from databases and handle error if any
- clickhouse response in the format accepted by Frontend

# Complete the clickhouse setup locally.
https://github.com/SigNoz/signoz/blob/main/CONTRIBUTING.md#to-run-clickhouse-setup-recommended-for-local-development
```


- **Interface Definitions**: Defines the methods exposed by the Query Service.
```

	GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams, skipConfig *model.SkipConfig) (*[]model.ServiceOverviewItem, *model.ApiError)
	GetTopLevelOperations(ctx context.Context, skipConfig *model.SkipConfig, start, end time.Time) (*map[string][]string, *map[string][]string, *model.ApiError)
	GetServices(ctx context.Context, query *model.GetServicesParams, skipConfig *model.SkipConfig) (*[]model.ServiceItem, *model.ApiError)
	GetTopOperations(ctx context.Context, query *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError)
	GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error)
	GetServicesList(ctx context.Context) (*[]string, error)
	GetDependencyGraph(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error)
```


- **HTTP Handlers**: Implements the HTTP handlers for various API endpoints.
```

func (aH *APIHandler) getServiceOverview(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServiceOverviewRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetServiceOverview(r.Context(), query, aH.skipConfig)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}

	aH.WriteJSON(w, r, result)

}

func (aH *APIHandler) getServicesTopLevelOps(w http.ResponseWriter, r *http.Request) {

	var start, end time.Time

	result, _, apiErr := aH.reader.GetTopLevelOperations(r.Context(), aH.skipConfig, start, end)
	if apiErr != nil {
		RespondError(w, apiErr, nil)
		return
	}

	aH.WriteJSON(w, r, result)
}

func (aH *APIHandler) getServices(w http.ResponseWriter, r *http.Request) {

	query, err := parseGetServicesRequest(r)
	if aH.HandleError(w, err, http.StatusBadRequest) {
		return
	}

	result, apiErr := aH.reader.GetServices(r.Context(), query, aH.skipConfig)
	if apiErr != nil && aH.HandleError(w, apiErr.Err, http.StatusInternalServerError) {
		return
	}
```


- **SQL Queries**: Contains the SQL queries used to fetch and process data.
```
WITH
-- Subquery for p99 calculation
p99_query AS (
    SELECT
        serviceName,
        quantile(0.99)(durationNano) / 1000000 as p99
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '1719212239057000000'
      AND timestamp <= '1719213139057000000'
      AND serviceName = 'producer-svc'
      AND kind = 4
      AND stringTagMap['messaging.destination.name'] = 'topic2'
      AND stringTagMap['messaging.destination.partition.id'] = '0'
    GROUP BY serviceName
),

-- Subquery for RPS calculation
rps_query AS (
    SELECT
        serviceName,
        count(*) / ((1719213139057000000 - 1719212239057000000) / 1000000000) as rps  -- Convert nanoseconds to seconds
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '1719212239057000000'
      AND timestamp <= '1719213139057000000'
      AND serviceName = 'producer-svc'
      AND kind = 4
      AND stringTagMap['messaging.destination.name'] = 'topic2'
      AND stringTagMap['messaging.destination.partition.id'] = '0'
    GROUP BY serviceName
),
```
This overview provides a high-level understanding of the Query Service's architecture, setup, and functionality.
