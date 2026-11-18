package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// postableSavedViewExamples returns example payloads attached to the saved view
// create endpoint. They cover each explorer source and both list and graph panels.
func postableSavedViewExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "traces_list",
			Summary:     "Traces list view with filter and columns",
			Description: "A list panel over spans slower than 500ms in one service, ordered newest first, with three explorer columns.",
			Value: map[string]any{
				"name":          "slow-checkout-traces",
				"source":        "traces",
				"schemaVersion": "v2",
				"spec": map[string]any{
					"displayName": "Slow checkout traces",
					"panelType":   "list",
					"requestType": "raw",
					"queries": []any{
						map[string]any{
							"type": "builder_query",
							"spec": map[string]any{
								"name":   "A",
								"signal": "traces",
								"filter": map[string]any{"expression": "service.name = 'checkoutservice' AND duration_nano > 500000000"},
								"order":  []any{map[string]any{"key": map[string]any{"name": "timestamp"}, "direction": "desc"}},
								"limit":  100,
							},
						},
					},
					"selectedFields": []any{
						map[string]any{"name": "service.name", "signal": "traces", "fieldContext": "resource", "fieldDataType": "string"},
						map[string]any{"name": "name", "signal": "traces", "fieldContext": "span", "fieldDataType": "string"},
						map[string]any{"name": "duration_nano", "signal": "traces", "fieldContext": "span", "fieldDataType": "float64"},
					},
				},
			},
		},
		{
			Name:        "logs_list_generated_name",
			Summary:     "Logs list view with a generated name",
			Description: "A list panel over error logs of one service. generateName lets the server derive the machine name from displayName; the display preferences set the row format and font size.",
			Value: map[string]any{
				"generateName":  true,
				"source":        "logs",
				"schemaVersion": "v2",
				"spec": map[string]any{
					"displayName": "Payment errors",
					"panelType":   "list",
					"requestType": "raw",
					"queries": []any{
						map[string]any{
							"type": "builder_query",
							"spec": map[string]any{
								"name":   "A",
								"signal": "logs",
								"filter": map[string]any{"expression": "service.name = 'paymentservice' AND severity_text = 'ERROR'"},
								"order": []any{
									map[string]any{"key": map[string]any{"name": "timestamp"}, "direction": "desc"},
									map[string]any{"key": map[string]any{"name": "id"}, "direction": "desc"},
								},
								"limit": 100,
							},
						},
					},
					"selectedFields": []any{
						map[string]any{"name": "service.name", "signal": "logs", "fieldContext": "resource", "fieldDataType": "string"},
						map[string]any{"name": "severity_text", "signal": "logs", "fieldContext": "log", "fieldDataType": "string"},
					},
					"display": map[string]any{
						"format":   "list",
						"fontSize": "small",
						"maxLines": 2,
					},
				},
			},
		},
		{
			Name:        "metrics_time_series",
			Summary:     "Metrics graph view",
			Description: "A graph panel plotting the per-second request rate of a counter, summed across series at one minute resolution.",
			Value: map[string]any{
				"name":          "http-request-rate",
				"source":        "metrics",
				"schemaVersion": "v2",
				"spec": map[string]any{
					"displayName": "HTTP request rate",
					"panelType":   "graph",
					"requestType": "time_series",
					"queries": []any{
						map[string]any{
							"type": "builder_query",
							"spec": map[string]any{
								"name":         "A",
								"signal":       "metrics",
								"stepInterval": 60,
								"aggregations": []any{map[string]any{"metricName": "http_requests_total", "timeAggregation": "rate", "spaceAggregation": "sum"}},
								"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}},
							},
						},
					},
					"selectedFields": []any{},
				},
			},
		},
		{
			Name:        "meter_time_series",
			Summary:     "Cost meter graph view",
			Description: "A graph panel on the meter explorer. Meter views are queried as metrics with the builder spec source set to meter; the meter rolls up hourly, so the step is 3600 seconds.",
			Value: map[string]any{
				"name":          "log-ingestion-volume",
				"source":        "meter",
				"schemaVersion": "v2",
				"spec": map[string]any{
					"displayName": "Log ingestion volume",
					"panelType":   "graph",
					"requestType": "time_series",
					"queries": []any{
						map[string]any{
							"type": "builder_query",
							"spec": map[string]any{
								"name":         "A",
								"signal":       "metrics",
								"source":       "meter",
								"stepInterval": 3600,
								"aggregations": []any{map[string]any{"metricName": "signoz.meter.log.size", "timeAggregation": "increase", "spaceAggregation": "sum"}},
							},
						},
					},
					"selectedFields": []any{},
				},
			},
		},
	}
}

// updatableSavedViewExamples returns example payloads attached to the saved view
// update endpoint. The update replaces the whole spec; the machine name is immutable.
func updatableSavedViewExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "traces_list_widen_filter",
			Summary:     "Replace a traces list view",
			Description: "Replaces the spec of an existing traces list view with a wider latency filter and one more column. Every field of spec must be sent again; the machine name stays as created.",
			Value: map[string]any{
				"source":        "traces",
				"schemaVersion": "v2",
				"spec": map[string]any{
					"displayName": "Slow checkout traces (over 250ms)",
					"panelType":   "list",
					"requestType": "raw",
					"queries": []any{
						map[string]any{
							"type": "builder_query",
							"spec": map[string]any{
								"name":   "A",
								"signal": "traces",
								"filter": map[string]any{"expression": "service.name = 'checkoutservice' AND duration_nano > 250000000"},
								"order":  []any{map[string]any{"key": map[string]any{"name": "timestamp"}, "direction": "desc"}},
								"limit":  100,
							},
						},
					},
					"selectedFields": []any{
						map[string]any{"name": "service.name", "signal": "traces", "fieldContext": "resource", "fieldDataType": "string"},
						map[string]any{"name": "name", "signal": "traces", "fieldContext": "span", "fieldDataType": "string"},
						map[string]any{"name": "duration_nano", "signal": "traces", "fieldContext": "span", "fieldDataType": "float64"},
						map[string]any{"name": "http.status_code", "signal": "traces", "fieldContext": "attribute", "fieldDataType": "string"},
					},
				},
			},
		},
	}
}
