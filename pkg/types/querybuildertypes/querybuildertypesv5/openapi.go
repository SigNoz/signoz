package querybuildertypesv5

import (
	"github.com/swaggest/jsonschema-go"
)

// Enum returns the acceptable values for QueryType.
func (QueryType) Enum() []any {
	return []any{
		QueryTypeBuilder,
		QueryTypeFormula,
		// Not yet supported.
		// QueryTypeSubQuery,
		// QueryTypeJoin,
		QueryTypeTraceOperator,
		QueryTypeClickHouseSQL,
		QueryTypePromQL,
	}
}

// Enum returns the acceptable values for RequestType.
func (RequestType) Enum() []any {
	return []any{
		RequestTypeScalar,
		RequestTypeTimeSeries,
		RequestTypeRaw,
		RequestTypeRawStream,
		RequestTypeTrace,
		// RequestTypeDistribution,
	}
}

// Enum returns the acceptable values for FunctionName.
func (FunctionName) Enum() []any {
	return []any{
		FunctionNameCutOffMin,
		FunctionNameCutOffMax,
		FunctionNameClampMin,
		FunctionNameClampMax,
		FunctionNameAbsolute,
		FunctionNameRunningDiff,
		FunctionNameLog2,
		FunctionNameLog10,
		FunctionNameCumulativeSum,
		FunctionNameEWMA3,
		FunctionNameEWMA5,
		FunctionNameEWMA7,
		FunctionNameMedian3,
		FunctionNameMedian5,
		FunctionNameMedian7,
		FunctionNameTimeShift,
		FunctionNameAnomaly,
		FunctionNameFillZero,
	}
}

// Enum returns the acceptable values for OrderDirection.
func (OrderDirection) Enum() []any {
	return []any{
		OrderDirectionAsc,
		OrderDirectionDesc,
	}
}

// Enum returns the acceptable values for ReduceTo.
func (ReduceTo) Enum() []any {
	return []any{
		ReduceToSum,
		ReduceToCount,
		ReduceToAvg,
		ReduceToMin,
		ReduceToMax,
		ReduceToLast,
		ReduceToMedian,
	}
}

// Enum returns the acceptable values for VariableType.
func (VariableType) Enum() []any {
	return []any{
		QueryVariableType,
		DynamicVariableType,
		CustomVariableType,
		TextBoxVariableType,
	}
}

// Enum returns the acceptable values for JoinType.
func (JoinType) Enum() []any {
	return []any{
		JoinTypeInner,
		JoinTypeLeft,
		JoinTypeRight,
		JoinTypeFull,
		JoinTypeCross,
	}
}

// Enum returns the acceptable values for ColumnType.
func (ColumnType) Enum() []any {
	return []any{
		ColumnTypeGroup,
		ColumnTypeAggregation,
	}
}

// queryEnvelopeBuilderTrace is the OpenAPI schema for a QueryEnvelope with type=builder_query and signal=traces.
type queryEnvelopeBuilderTrace struct {
	Type QueryType                           `json:"type" description:"The type of the query."`
	Spec QueryBuilderQuery[TraceAggregation] `json:"spec" description:"The trace builder query specification."`
}

// queryEnvelopeBuilderLog is the OpenAPI schema for a QueryEnvelope with type=builder_query and signal=logs.
type queryEnvelopeBuilderLog struct {
	Type QueryType                         `json:"type" description:"The type of the query."`
	Spec QueryBuilderQuery[LogAggregation] `json:"spec" description:"The log builder query specification."`
}

// queryEnvelopeBuilderMetric is the OpenAPI schema for a QueryEnvelope with type=builder_query and signal=metrics.
type queryEnvelopeBuilderMetric struct {
	Type QueryType                            `json:"type" description:"The type of the query."`
	Spec QueryBuilderQuery[MetricAggregation] `json:"spec" description:"The metric builder query specification."`
}

// queryEnvelopeFormula is the OpenAPI schema for a QueryEnvelope with type=builder_formula.
type queryEnvelopeFormula struct {
	Type QueryType           `json:"type" description:"The type of the query."`
	Spec QueryBuilderFormula `json:"spec" description:"The formula specification."`
}

// queryEnvelopeJoin is the OpenAPI schema for a QueryEnvelope with type=builder_join.
// type queryEnvelopeJoin struct {
// 	Type QueryType        `json:"type" description:"The type of the query."`
// 	Spec QueryBuilderJoin `json:"spec" description:"The join specification."`
// }

// queryEnvelopeTraceOperator is the OpenAPI schema for a QueryEnvelope with type=builder_trace_operator.
type queryEnvelopeTraceOperator struct {
	Type QueryType                 `json:"type" description:"The type of the query."`
	Spec QueryBuilderTraceOperator `json:"spec" description:"The trace operator specification."`
}

// queryEnvelopePromQL is the OpenAPI schema for a QueryEnvelope with type=promql.
type queryEnvelopePromQL struct {
	Type QueryType `json:"type" description:"The type of the query."`
	Spec PromQuery `json:"spec" description:"The PromQL query specification."`
}

// queryEnvelopeClickHouseSQL is the OpenAPI schema for a QueryEnvelope with type=clickhouse_sql.
type queryEnvelopeClickHouseSQL struct {
	Type QueryType       `json:"type" description:"The type of the query."`
	Spec ClickHouseQuery `json:"spec" description:"The ClickHouse SQL query specification."`
}

var _ jsonschema.OneOfExposer = QueryEnvelope{}

// JSONSchemaOneOf returns the oneOf variants for the QueryEnvelope discriminated union.
// Each variant represents a different query type with its corresponding spec schema.
func (QueryEnvelope) JSONSchemaOneOf() []any {
	return []any{
		queryEnvelopeBuilderTrace{},
		queryEnvelopeBuilderLog{},
		queryEnvelopeBuilderMetric{},
		queryEnvelopeFormula{},
		// queryEnvelopeJoin{},
		queryEnvelopeTraceOperator{},
		queryEnvelopePromQL{},
		queryEnvelopeClickHouseSQL{},
	}
}

var _ jsonschema.Exposer = Step{}

// JSONSchema returns a custom schema for Step that accepts either a duration string or a number (seconds).
func (Step) JSONSchema() (jsonschema.Schema, error) {
	s := jsonschema.Schema{}
	s.WithDescription("Step interval. Accepts a Go duration string (e.g., \"60s\", \"1m\", \"1h\") or a number representing seconds (e.g., 60).")

	strSchema := jsonschema.Schema{}
	strSchema.WithType(jsonschema.String.Type())
	strSchema.WithExamples("60s", "5m", "1h")
	strSchema.WithDescription("Duration string (e.g., \"60s\", \"5m\", \"1h\").")

	numSchema := jsonschema.Schema{}
	numSchema.WithType(jsonschema.Number.Type())
	numSchema.WithExamples(60, 300, 3600)
	numSchema.WithDescription("Duration in seconds.")

	s.OneOf = []jsonschema.SchemaOrBool{
		strSchema.ToSchemaOrBool(),
		numSchema.ToSchemaOrBool(),
	}
	return s, nil
}

var _ jsonschema.OneOfExposer = QueryData{}

// JSONSchemaOneOf documents the polymorphic result types in QueryData.Results.
func (QueryData) JSONSchemaOneOf() []any {
	return []any{
		TimeSeriesData{},
		ScalarData{},
		RawData{},
	}
}

var _ jsonschema.Preparer = &QueryRangeRequest{}

// PrepareJSONSchema adds examples and description to the QueryRangeRequest schema.
func (q *QueryRangeRequest) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Request body for the v5 query range endpoint. Supports builder queries (traces, logs, metrics), formulas, joins, trace operators, PromQL, and ClickHouse SQL queries.")
	schema.WithExamples(
		// 1. time_series + traces builder: count spans grouped by service, ordered by count
		map[string]any{
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
								map[string]any{
									"expression": "count()",
									"alias":      "span_count",
								},
							},
							"stepInterval": "60s",
							"filter": map[string]any{
								"expression": "service.name = 'frontend'",
							},
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
							"order": []any{
								map[string]any{
									"key":       map[string]any{"name": "span_count"},
									"direction": "desc",
								},
							},
							"limit": 10,
						},
					},
				},
			},
		},
		// 2. time_series + logs builder: count logs grouped by service
		map[string]any{
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
								map[string]any{
									"expression": "count()",
									"alias":      "log_count",
								},
							},
							"stepInterval": "60s",
							"filter": map[string]any{
								"expression": "severity_text = 'ERROR'",
							},
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
							"order": []any{
								map[string]any{
									"key":       map[string]any{"name": "log_count"},
									"direction": "desc",
								},
							},
							"limit": 10,
						},
					},
				},
			},
		},
		// 3. time_series + metrics builder (Gauge): latest value averaged across series
		map[string]any{
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
								map[string]any{
									"metricName":       "system.cpu.utilization",
									"timeAggregation":  "latest",
									"spaceAggregation": "avg",
								},
							},
							"stepInterval": "60s",
							"groupBy": []any{
								map[string]any{
									"name":         "host.name",
									"fieldContext": "resource",
								},
							},
						},
					},
				},
			},
		},
		// 4. time_series + metrics builder (Sum): rate of cumulative counter
		map[string]any{
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
								map[string]any{
									"metricName":       "http.server.duration.count",
									"timeAggregation":  "rate",
									"spaceAggregation": "sum",
								},
							},
							"stepInterval": 120,
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
						},
					},
				},
			},
		},
		// 5. time_series + metrics builder (Histogram): p99 latency
		map[string]any{
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
								map[string]any{
									"metricName":       "http.server.duration.bucket",
									"spaceAggregation": "p99",
								},
							},
							"stepInterval": "60s",
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
						},
					},
				},
			},
		},
		// 6. raw + logs builder: fetch raw log records
		map[string]any{
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
							"filter": map[string]any{
								"expression": "severity_text = 'ERROR'",
							},
							"selectFields": []any{
								map[string]any{
									"name":         "body",
									"fieldContext": "log",
								},
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
							"order": []any{
								map[string]any{
									"key":       map[string]any{"name": "timestamp", "fieldContext": "log"},
									"direction": "desc",
								},
								map[string]any{
									"key":       map[string]any{"name": "id"},
									"direction": "desc",
								},
							},
							"limit":  50,
							"offset": 0,
						},
					},
				},
			},
		},
		// 7. raw + traces builder: fetch raw span records
		map[string]any{
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
							"filter": map[string]any{
								"expression": "service.name = 'frontend' AND has_error = true",
							},
							"selectFields": []any{
								map[string]any{
									"name":         "name",
									"fieldContext": "span",
								},
								map[string]any{
									"name":         "duration_nano",
									"fieldContext": "span",
								},
							},
							"order": []any{
								map[string]any{
									"key":       map[string]any{"name": "timestamp", "fieldContext": "span"},
									"direction": "desc",
								},
							},
							"limit": 100,
						},
					},
				},
			},
		},
		// 8. scalar + traces builder: total span count as a single value
		map[string]any{
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
								map[string]any{
									"expression": "count()",
									"alias":      "span_count",
								},
							},
							"filter": map[string]any{
								"expression": "service.name = 'frontend'",
							},
						},
					},
				},
			},
		},
		// 9. scalar + logs builder: total error log count as a single value
		map[string]any{
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
								map[string]any{
									"expression": "count()",
									"alias":      "error_count",
								},
							},
							"filter": map[string]any{
								"expression": "severity_text = 'ERROR'",
							},
						},
					},
				},
			},
		},
		// 10. scalar + metrics builder: single reduced value with reduceTo
		map[string]any{
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
								map[string]any{
									"metricName":       "http.server.duration.count",
									"timeAggregation":  "rate",
									"spaceAggregation": "sum",
									"reduceTo":         "sum",
								},
							},
							"stepInterval": "60s",
						},
					},
				},
			},
		},
		// 11. builder formula: error rate from two trace queries
		map[string]any{
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
								map[string]any{
									"expression": "countIf(has_error = true)",
								},
							},
							"stepInterval": "60s",
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
						},
					},
					map[string]any{
						"type": "builder_query",
						"spec": map[string]any{
							"name":   "B",
							"signal": "traces",
							"aggregations": []any{
								map[string]any{
									"expression": "count()",
								},
							},
							"stepInterval": "60s",
							"groupBy": []any{
								map[string]any{
									"name":         "service.name",
									"fieldContext": "resource",
								},
							},
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
		// 12. PromQL query with UTF-8 dot metric name
		map[string]any{
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
		// 13. ClickHouse SQL — time_series
		map[string]any{
			"schemaVersion": "v1",
			"start":         1640995200000,
			"end":           1640998800000,
			"requestType":   "time_series",
			"compositeQuery": map[string]any{
				"queries": []any{
					map[string]any{
						"type": "clickhouse_sql",
						"spec": map[string]any{
							"name":  "span_rate",
							"query": "SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, count() AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= $start_datetime AND timestamp <= $end_datetime GROUP BY ts ORDER BY ts",
						},
					},
				},
			},
		},
		// 14. ClickHouse SQL — raw
		map[string]any{
			"schemaVersion": "v1",
			"start":         1640995200000,
			"end":           1640998800000,
			"requestType":   "raw",
			"compositeQuery": map[string]any{
				"queries": []any{
					map[string]any{
						"type": "clickhouse_sql",
						"spec": map[string]any{
							"name":  "recent_errors",
							"query": "SELECT timestamp, body FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= $start_timestamp_nano AND timestamp <= $end_timestamp_nano AND severity_text = 'ERROR' ORDER BY timestamp DESC LIMIT 100",
						},
					},
				},
			},
		},
		// 15. ClickHouse SQL — scalar
		map[string]any{
			"schemaVersion": "v1",
			"start":         1640995200000,
			"end":           1640998800000,
			"requestType":   "scalar",
			"compositeQuery": map[string]any{
				"queries": []any{
					map[string]any{
						"type": "clickhouse_sql",
						"spec": map[string]any{
							"name":  "total_spans",
							"query": "SELECT count() AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= $start_datetime AND timestamp <= $end_datetime",
						},
					},
				},
			},
		},
	)
	return nil
}

var _ jsonschema.Preparer = &QueryRangeResponse{}

// PrepareJSONSchema adds description to the QueryRangeResponse schema.
func (q *QueryRangeResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response from the v5 query range endpoint. The data.results array contains typed results depending on the requestType: TimeSeriesData for time_series, ScalarData for scalar, or RawData for raw requests.")
	return nil
}

var _ jsonschema.Preparer = &CompositeQuery{}

// PrepareJSONSchema adds description to the CompositeQuery schema.
func (c *CompositeQuery) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.")
	return nil
}

var _ jsonschema.Preparer = &ExecStats{}

// PrepareJSONSchema adds description to the ExecStats schema.
func (e *ExecStats) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Execution statistics for the query, including rows scanned, bytes scanned, and duration.")
	return nil
}
