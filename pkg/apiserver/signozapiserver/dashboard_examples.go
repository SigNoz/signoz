package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// gridItem places a panel on the 12-column grid of a Grid layout.
func gridItem(panelID string, x, y, width, height int) map[string]any {
	return map[string]any{
		"x": x, "y": y, "width": width, "height": height,
		"content": map[string]any{"$ref": "#/spec/panels/" + panelID},
	}
}

func gridLayout(items ...map[string]any) map[string]any {
	list := make([]any, 0, len(items))
	for _, item := range items {
		list = append(list, item)
	}
	return map[string]any{"kind": "Grid", "spec": map[string]any{"items": list}}
}

// builderQuery wraps a builder query spec in the panel query envelope.
// requestType is the result shape the panel renders: time_series, scalar or raw.
func builderQuery(requestType string, spec map[string]any) map[string]any {
	return map[string]any{
		"kind": requestType,
		"spec": map[string]any{
			"name":   spec["name"],
			"plugin": map[string]any{"kind": "signoz/BuilderQuery", "spec": spec},
		},
	}
}

func panel(name, description string, plugin map[string]any, queries ...map[string]any) map[string]any {
	list := make([]any, 0, len(queries))
	for _, q := range queries {
		list = append(list, q)
	}
	return map[string]any{
		"kind": "Panel",
		"spec": map[string]any{
			"display": map[string]any{"name": name, "description": description},
			"links":   []any{},
			"plugin":  plugin,
			"queries": list,
		},
	}
}

func serviceNameGroupBy() []any {
	return []any{map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}}
}

// createDashboardExamples returns example payloads for the dashboard create
// endpoint. They cover a variable-driven service overview and a logs dashboard
// that pairs a query-less text panel with a table.
func createDashboardExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "service_overview",
			Summary:     "Service overview with a variable, a time series panel and a number panel",
			Description: "A `$service` list variable fed by the observed `service.name` values filters both panels. The time series panel counts spans per service; the number panel renders a single scalar and turns red above 100 errors. `generateName` lets the server derive the name from the display name.",
			Value: map[string]any{
				"schemaVersion": "v6",
				"generateName":  true,
				"tags":          []any{map[string]any{"key": "team", "value": "platform"}},
				"spec": map[string]any{
					"display": map[string]any{"name": "Service Overview", "description": "Request rate and errors per service"},
					"variables": []any{
						map[string]any{
							"kind": "ListVariable",
							"spec": map[string]any{
								"name":          "service",
								"display":       map[string]any{"name": "Service"},
								"allowMultiple": true,
								"allowAllValue": true,
								"sort":          "alphabetical-asc",
								"plugin": map[string]any{
									"kind": "signoz/DynamicVariable",
									"spec": map[string]any{"name": "service.name", "signal": "traces"},
								},
							},
						},
					},
					"panels": map[string]any{
						"request-rate": panel("Requests", "Spans per service",
							map[string]any{
								"kind": "signoz/TimeSeriesPanel",
								"spec": map[string]any{
									"formatting": map[string]any{"decimalPrecision": "0"},
									"legend":     map[string]any{"position": "bottom"},
								},
							},
							builderQuery("time_series", map[string]any{
								"name":         "A",
								"signal":       "traces",
								"aggregations": []any{map[string]any{"expression": "count()", "alias": "requests"}},
								"filter":       map[string]any{"expression": "service.name IN $service"},
								"groupBy":      serviceNameGroupBy(),
								"legend":       "{{service.name}}",
							}),
						),
						"error-count": panel("Errors", "Spans with an error status",
							map[string]any{
								"kind": "signoz/NumberPanel",
								"spec": map[string]any{
									"thresholds": []any{
										map[string]any{"value": 100, "operator": "above", "color": "#F1575F", "format": "background"},
									},
								},
							},
							builderQuery("scalar", map[string]any{
								"name":         "A",
								"signal":       "traces",
								"aggregations": []any{map[string]any{"expression": "count()", "alias": "errors"}},
								"filter":       map[string]any{"expression": "has_error = true AND service.name IN $service"},
							}),
						),
					},
					"layouts": []any{gridLayout(
						gridItem("request-rate", 0, 0, 8, 6),
						gridItem("error-count", 8, 0, 4, 6),
					)},
					"duration": "1h",
					"links":    []any{},
				},
			},
		},
		{
			Name:        "logs_table_with_runbook",
			Summary:     "Logs dashboard with a text panel and a table panel",
			Description: "A `signoz/TextPanel` renders markdown and must send `queries: []`. The table counts error logs per service as a scalar result, orders by the `errors` alias and colors cells above 1000 errors; the threshold names the column by its key `A` (the query name), not by the alias.",
			Value: map[string]any{
				"schemaVersion": "v6",
				"name":          "error-logs-by-service",
				"tags":          []any{},
				"spec": map[string]any{
					"display":   map[string]any{"name": "Error Logs by Service", "description": ""},
					"variables": []any{},
					"panels": map[string]any{
						"runbook": panel("Runbook", "What to do when errors spike",
							map[string]any{
								"kind": "signoz/TextPanel",
								"spec": map[string]any{
									"mode":          "markdown",
									"text":          "## Error logs\n\n1. Find the service with the most errors in the table.\n2. Open its logs and group by `code.function`.",
									"presentation":  map[string]any{"textAlign": "left", "verticalAlign": "top"},
									"headerOptions": map[string]any{"hide": false},
								},
							},
						),
						"errors-by-service": panel("Error logs per service", "",
							map[string]any{
								"kind": "signoz/TablePanel",
								"spec": map[string]any{
									"formatting": map[string]any{"decimalPrecision": "0"},
									"thresholds": []any{
										map[string]any{"columnName": "A", "value": 1000, "operator": "above", "color": "#F1575F", "format": "background"},
									},
								},
							},
							builderQuery("scalar", map[string]any{
								"name":         "A",
								"signal":       "logs",
								"aggregations": []any{map[string]any{"expression": "count()", "alias": "errors"}},
								"filter":       map[string]any{"expression": "severity_text = 'ERROR'"},
								"groupBy":      serviceNameGroupBy(),
								"order":        []any{map[string]any{"key": map[string]any{"name": "errors"}, "direction": "desc"}},
								"limit":        20,
							}),
						),
					},
					"layouts": []any{gridLayout(
						gridItem("runbook", 0, 0, 4, 6),
						gridItem("errors-by-service", 4, 0, 8, 6),
					)},
					"links": []any{},
				},
			},
		},
	}
}

// updateDashboardExamples returns the example payload for the dashboard update
// endpoint: the full replacement shape, including the immutable name.
func updateDashboardExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "replace_dashboard",
			Summary:     "Replace a dashboard with a single CPU time series panel",
			Description: "Update is a full replacement: every field is written as sent, so fetch the dashboard first and resend the unchanged parts. `name` must equal the dashboard's current name.",
			Value: map[string]any{
				"schemaVersion": "v6",
				"name":          "host-cpu",
				"tags":          []any{map[string]any{"key": "team", "value": "infra"}},
				"spec": map[string]any{
					"display":   map[string]any{"name": "Host CPU", "description": "CPU time by state"},
					"variables": []any{},
					"panels": map[string]any{
						"cpu-time": panel("CPU time", "Rate of system.cpu.time by state",
							map[string]any{
								"kind": "signoz/TimeSeriesPanel",
								"spec": map[string]any{
									"chartAppearance": map[string]any{"fillMode": "gradient"},
									"legend":          map[string]any{"position": "right"},
								},
							},
							builderQuery("time_series", map[string]any{
								"name":   "A",
								"signal": "metrics",
								"aggregations": []any{map[string]any{
									"metricName":       "system.cpu.time",
									"timeAggregation":  "rate",
									"spaceAggregation": "sum",
								}},
								"groupBy": []any{map[string]any{"name": "state", "fieldContext": "attribute", "fieldDataType": "string"}},
								"legend":  "{{state}}",
							}),
						),
					},
					"layouts":         []any{gridLayout(gridItem("cpu-time", 0, 0, 12, 7))},
					"duration":        "3h",
					"refreshInterval": "30s",
					"links":           []any{},
				},
			},
		},
	}
}

// patchDashboardExamples returns example payloads for the dashboard patch
// endpoint. The request body is the RFC 6902 operation array itself.
func patchDashboardExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "rename",
			Summary:     "Rename a dashboard",
			Description: "Replaces the display name without resending anything else.",
			Value: []any{
				map[string]any{"op": "replace", "path": "/spec/display/name", "value": "Service Overview (production)"},
			},
		},
		{
			Name:        "add_panel",
			Summary:     "Add a panel and place it",
			Description: "Adding a panel takes two operations: one adds the panel under `/spec/panels/<id>`, the other appends a grid item that references it to the first layout. A panel that no layout places is accepted but not shown.",
			Value: []any{
				map[string]any{
					"op":   "add",
					"path": "/spec/panels/error-rate",
					"value": panel("Error count", "Errored spans per time bucket",
						map[string]any{"kind": "signoz/TimeSeriesPanel", "spec": map[string]any{}},
						builderQuery("time_series", map[string]any{
							"name":         "A",
							"signal":       "traces",
							"aggregations": []any{map[string]any{"expression": "count()"}},
							"filter":       map[string]any{"expression": "has_error = true"},
						}),
					),
				},
				map[string]any{
					"op":    "add",
					"path":  "/spec/layouts/0/spec/items/-",
					"value": gridItem("error-rate", 0, 7, 12, 6),
				},
			},
		},
	}
}
