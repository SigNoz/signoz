package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/gorilla/mux"
)

func (provider *provider) addQuerierRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v5/query_range", handler.New(provider.authZ.ViewAccess(provider.querierHandler.QueryRange), handler.OpenAPIDef{
		ID:                 "QueryRangeV5",
		Tags:               []string{"querier"},
		Summary:            "Query range",
		Description:        "Execute a composite query over a time range. Supports builder queries (traces, logs, metrics), formulas, trace operators, PromQL, and ClickHouse SQL.",
		Request:            new(qbtypes.QueryRangeRequest),
		RequestContentType: "application/json",
		RequestExamples: []handler.OpenAPIExample{
			{
				Name:    "traces_time_series",
				Summary: "Time series: count spans grouped by service",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "traces",
									"aggregations": []any{
										map[string]any{"expression": "count()", "alias": "span_count"},
									},
									"stepInterval": "60s",
									"filter":       map[string]any{"expression": "service.name = 'frontend'"},
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
									"order":        []any{map[string]any{"key": map[string]any{"name": "span_count"}, "direction": "desc"}},
									"limit":        10,
								},
							},
						},
					},
				},
			},
			{
				Name:    "logs_time_series",
				Summary: "Time series: count error logs grouped by service",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "logs",
									"aggregations": []any{
										map[string]any{"expression": "count()", "alias": "log_count"},
									},
									"stepInterval": "60s",
									"filter":       map[string]any{"expression": "severity_text = 'ERROR'"},
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
									"order":        []any{map[string]any{"key": map[string]any{"name": "log_count"}, "direction": "desc"}},
									"limit":        10,
								},
							},
						},
					},
				},
			},
			{
				Name:    "metrics_gauge_time_series",
				Summary: "Time series: latest gauge value averaged across series",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "metrics",
									"aggregations": []any{
										map[string]any{"metricName": "system.cpu.utilization", "timeAggregation": "latest", "spaceAggregation": "avg"},
									},
									"stepInterval": "60s",
									"groupBy":      []any{map[string]any{"name": "host.name", "fieldContext": "resource"}},
								},
							},
						},
					},
				},
			},
			{
				Name:    "metrics_rate_time_series",
				Summary: "Time series: rate of cumulative counter",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "metrics",
									"aggregations": []any{
										map[string]any{"metricName": "http.server.duration.count", "timeAggregation": "rate", "spaceAggregation": "sum"},
									},
									"stepInterval": 120,
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
								},
							},
						},
					},
				},
			},
			{
				Name:    "metrics_histogram_time_series",
				Summary: "Time series: p99 latency from histogram",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "metrics",
									"aggregations": []any{
										map[string]any{"metricName": "http.server.duration.bucket", "spaceAggregation": "p99"},
									},
									"stepInterval": "60s",
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
								},
							},
						},
					},
				},
			},
			{
				Name:    "logs_raw",
				Summary: "Raw: fetch raw log records",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "raw",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "logs",
									"filter": map[string]any{"expression": "severity_text = 'ERROR'"},
									"selectFields": []any{
										map[string]any{"name": "body", "fieldContext": "log"},
										map[string]any{"name": "service.name", "fieldContext": "resource"},
									},
									"order": []any{
										map[string]any{"key": map[string]any{"name": "timestamp", "fieldContext": "log"}, "direction": "desc"},
										map[string]any{"key": map[string]any{"name": "id"}, "direction": "desc"},
									},
									"limit":  50,
									"offset": 0,
								},
							},
						},
					},
				},
			},
			{
				Name:    "traces_raw",
				Summary: "Raw: fetch raw span records",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "raw",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "traces",
									"filter": map[string]any{"expression": "service.name = 'frontend' AND has_error = true"},
									"selectFields": []any{
										map[string]any{"name": "name", "fieldContext": "span"},
										map[string]any{"name": "duration_nano", "fieldContext": "span"},
									},
									"order": []any{
										map[string]any{"key": map[string]any{"name": "timestamp", "fieldContext": "span"}, "direction": "desc"},
									},
									"limit": 100,
								},
							},
						},
					},
				},
			},
			{
				Name:    "traces_scalar",
				Summary: "Scalar: total span count",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "scalar",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "traces",
									"aggregations": []any{
										map[string]any{"expression": "count()", "alias": "span_count"},
									},
									"filter": map[string]any{"expression": "service.name = 'frontend'"},
								},
							},
						},
					},
				},
			},
			{
				Name:    "logs_scalar",
				Summary: "Scalar: total error log count",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "scalar",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "logs",
									"aggregations": []any{
										map[string]any{"expression": "count()", "alias": "error_count"},
									},
									"filter": map[string]any{"expression": "severity_text = 'ERROR'"},
								},
							},
						},
					},
				},
			},
			{
				Name:    "metrics_scalar",
				Summary: "Scalar: single reduced metric value",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "scalar",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":   "A",
									"signal": "metrics",
									"aggregations": []any{
										map[string]any{"metricName": "http.server.duration.count", "timeAggregation": "rate", "spaceAggregation": "sum", "reduceTo": "sum"},
									},
									"stepInterval": "60s",
								},
							},
						},
					},
				},
			},
			{
				Name:    "formula",
				Summary: "Formula: error rate from two trace queries",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "traces",
									"aggregations": []any{map[string]any{"expression": "countIf(has_error = true)"}},
									"stepInterval": "60s",
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "traces",
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"stepInterval": "60s",
									"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "error_rate",
									"expression": "A / B * 100",
								},
							},
						},
					},
				},
			},
			{
				Name:    "promql",
				Summary: "PromQL: request rate with UTF-8 metric name",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "promql",
								"spec": map[string]any{
									"name":  "request_rate",
									"query": "sum(rate({\"http.server.duration.count\"}[5m])) by (\"service.name\")",
									"step":  60,
								},
							},
						},
					},
				},
			},
			{
				Name:    "clickhouse_sql_traces_time_series",
				Summary: "ClickHouse SQL: traces time series with resource filter",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "time_series",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "clickhouse_sql",
								"spec": map[string]any{
									"name": "span_rate",
									"query": "WITH __resource_filter AS (" +
										" SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource" +
										" WHERE seen_at_ts_bucket_start >= $start_timestamp - 1800 AND seen_at_ts_bucket_start <= $end_timestamp" +
										" ) SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, count() AS value" +
										" FROM signoz_traces.distributed_signoz_index_v3" +
										" WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)" +
										" AND timestamp >= $start_datetime AND timestamp <= $end_datetime" +
										" AND ts_bucket_start >= $start_timestamp - 1800 AND ts_bucket_start <= $end_timestamp" +
										" GROUP BY ts ORDER BY ts",
								},
							},
						},
					},
				},
			},
			{
				Name:    "clickhouse_sql_logs_raw",
				Summary: "ClickHouse SQL: raw logs with resource filter",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "raw",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "clickhouse_sql",
								"spec": map[string]any{
									"name": "recent_errors",
									"query": "WITH __resource_filter AS (" +
										" SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource" +
										" WHERE seen_at_ts_bucket_start >= $start_timestamp - 1800 AND seen_at_ts_bucket_start <= $end_timestamp" +
										" ) SELECT timestamp, body" +
										" FROM signoz_logs.distributed_logs_v2" +
										" WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)" +
										" AND timestamp >= $start_timestamp_nano AND timestamp <= $end_timestamp_nano" +
										" AND ts_bucket_start >= $start_timestamp - 1800 AND ts_bucket_start <= $end_timestamp" +
										" AND severity_text = 'ERROR'" +
										" ORDER BY timestamp DESC LIMIT 100",
								},
							},
						},
					},
				},
			},
			{
				Name:    "clickhouse_sql_traces_scalar",
				Summary: "ClickHouse SQL: scalar aggregate with resource filter",
				Value: map[string]any{
					"schemaVersion": "v1",
					"start":         1640995200000,
					"end":           1640998800000,
					"requestType":   "scalar",
					"compositeQuery": map[string]any{
						"queries": []any{
							map[string]any{
								"type": "clickhouse_sql",
								"spec": map[string]any{
									"name": "total_spans",
									"query": "WITH __resource_filter AS (" +
										" SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource" +
										" WHERE seen_at_ts_bucket_start >= $start_timestamp - 1800 AND seen_at_ts_bucket_start <= $end_timestamp" +
										" ) SELECT count() AS value" +
										" FROM signoz_traces.distributed_signoz_index_v3" +
										" WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)" +
										" AND timestamp >= $start_datetime AND timestamp <= $end_datetime" +
										" AND ts_bucket_start >= $start_timestamp - 1800 AND ts_bucket_start <= $end_timestamp",
								},
							},
						},
					},
				},
			},
		},
		Response:            new(qbtypes.QueryRangeResponse),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v5/substitute_vars", handler.New(provider.authZ.ViewAccess(provider.querierHandler.ReplaceVariables), handler.OpenAPIDef{
		ID:                  "ReplaceVariables",
		Tags:                []string{"querier"},
		Summary:             "Replace variables",
		Description:         "Replace variables in a query",
		Request:             new(qbtypes.QueryRangeRequest),
		RequestContentType:  "application/json",
		Response:            new(qbtypes.QueryRangeRequest),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
