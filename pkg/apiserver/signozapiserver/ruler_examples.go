package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// postableRuleExamples returns example payloads attached to every rule-write
// endpoint. They cover each alert type, rule type, and composite-query shape.
func postableRuleExamples() []handler.OpenAPIExample {
	rolling := func(evalWindow, frequency string) map[string]any {
		return map[string]any{
			"kind": "rolling",
			"spec": map[string]any{"evalWindow": evalWindow, "frequency": frequency},
		}
	}
	renotify := func(interval string, states ...string) map[string]any {
		s := make([]any, 0, len(states))
		for _, v := range states {
			s = append(s, v)
		}
		return map[string]any{
			"enabled":     true,
			"interval":    interval,
			"alertStates": s,
		}
	}

	return []handler.OpenAPIExample{
		{
			Name:        "metric_threshold_single",
			Summary:     "Metric threshold single builder query",
			Description: "Fires when a pod consumes more than 80% of its requested CPU for the whole evaluation window. Uses `k8s.pod.cpu_request_utilization`.",
			Value: map[string]any{
				"alert":         "Pod CPU above 80% of request",
				"alertType":     "METRIC_BASED_ALERT",
				"description":   "CPU usage for api-service pods exceeds 80% of the requested CPU",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "percentunit",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "metrics",
									"stepInterval": 60,
									"aggregations": []any{map[string]any{"metricName": "k8s.pod.cpu_request_utilization", "timeAggregation": "avg", "spaceAggregation": "max"}},
									"filter":       map[string]any{"expression": "k8s.deployment.name = 'api-service'"},
									"groupBy": []any{
										map[string]any{"name": "k8s.pod.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"},
									},
									"legend": "{{k8s.pod.name}} ({{deployment.environment}})",
								},
							},
						},
					},
					"selectedQueryName": "A",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "all_the_times",
								"target":    0.8,
								"channels":  []any{"slack-platform", "pagerduty-oncall"},
							},
						},
					},
				},
				"evaluation": rolling("15m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"k8s.pod.name", "deployment.environment"},
					"renotify": renotify("4h", "firing"),
				},
				"labels": map[string]any{"severity": "critical", "team": "platform"},
				"annotations": map[string]any{
					"description": "Pod {{$k8s.pod.name}} CPU is at {{$value}} of request in {{$deployment.environment}}.",
					"summary":     "Pod CPU above {{$threshold}} of request",
				},
			},
		},
		{
			Name:        "metric_threshold_formula",
			Summary:     "Metric threshold multi-query formula",
			Description: "Computes disk utilization as (1 - available/capacity) * 100 by combining two disabled base queries with a builder_formula. The formula emits 0–100, so compositeQuery.unit is set to \"percent\" and the target is a bare number.",
			Value: map[string]any{
				"alert":         "PersistentVolume above 80% utilization",
				"alertType":     "METRIC_BASED_ALERT",
				"description":   "Disk utilization for a persistent volume is above 80%",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "percent",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "metrics",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"metricName": "k8s.volume.available", "timeAggregation": "max", "spaceAggregation": "max"}},
									"filter":       map[string]any{"expression": "k8s.volume.type = 'persistentVolumeClaim'"},
									"groupBy": []any{
										map[string]any{"name": "k8s.persistentvolumeclaim.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "k8s.namespace.name", "fieldContext": "resource", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "metrics",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"metricName": "k8s.volume.capacity", "timeAggregation": "max", "spaceAggregation": "max"}},
									"filter":       map[string]any{"expression": "k8s.volume.type = 'persistentVolumeClaim'"},
									"groupBy": []any{
										map[string]any{"name": "k8s.persistentvolumeclaim.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "k8s.namespace.name", "fieldContext": "resource", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "F1",
									"expression": "(1 - A/B) * 100",
									"legend":     "{{k8s.persistentvolumeclaim.name}} ({{k8s.namespace.name}})",
								},
							},
						},
					},
					"selectedQueryName": "F1",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "at_least_once",
								"target":    80,
								"channels":  []any{"slack-storage"},
							},
						},
					},
				},
				"evaluation": rolling("30m", "5m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"k8s.namespace.name", "k8s.persistentvolumeclaim.name"},
					"renotify": renotify("2h", "firing"),
				},
				"labels": map[string]any{"severity": "critical"},
				"annotations": map[string]any{
					"description": "Volume {{$k8s.persistentvolumeclaim.name}} in {{$k8s.namespace.name}} is {{$value}}% full.",
					"summary":     "Disk utilization above {{$threshold}}%",
				},
			},
		},
		{
			Name:        "metric_promql",
			Summary:     "Metric threshold PromQL rule",
			Description: "PromQL expression instead of the builder. Dotted OTEL resource attributes are quoted (\"deployment.environment\"). Useful for queries that combine series with group_right or other Prom operators.",
			Value: map[string]any{
				"alert":         "Kafka consumer group lag above 1000",
				"alertType":     "METRIC_BASED_ALERT",
				"description":   "Consumer group lag computed via PromQL",
				"ruleType":      "promql_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "promql",
						"panelType": "graph",
						"queries": []any{
							map[string]any{
								"type": "promql",
								"spec": map[string]any{
									"name":   "A",
									"query":  "(max by(topic, partition, \"deployment.environment\")(kafka_log_end_offset) - on(topic, partition, \"deployment.environment\") group_right max by(group, topic, partition, \"deployment.environment\")(kafka_consumer_committed_offset)) > 0",
									"legend": "{{topic}}/{{partition}} ({{group}})",
								},
							},
						},
					},
					"selectedQueryName": "A",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "all_the_times",
								"target":    1000,
								"channels":  []any{"slack-data-platform", "pagerduty-data"},
							},
						},
					},
				},
				"evaluation": rolling("10m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"group", "topic"},
					"renotify": renotify("1h", "firing"),
				},
				"labels": map[string]any{"severity": "critical"},
				"annotations": map[string]any{
					"description": "Consumer group {{$group}} is {{$value}} messages behind on {{$topic}}/{{$partition}}.",
					"summary":     "Kafka consumer lag high",
				},
			},
		},
		{
			Name:        "metric_anomaly",
			Summary:     "Metric anomaly rule (v1 only)",
			Description: "Anomaly rules are not yet supported under schemaVersion v2alpha1, so this example uses the v1 shape. Wraps a builder query in the `anomaly` function with daily seasonality SigNoz compares each point against the forecast for that time of day. Fires when the anomaly score stays below the threshold for the entire window; `requireMinPoints` guards against noisy intervals.",
			Value: map[string]any{
				"alert":       "Anomalous drop in ingested spans",
				"alertType":   "METRIC_BASED_ALERT",
				"description": "Detect an abrupt drop in span ingestion using a z-score anomaly function",
				"ruleType":    "anomaly_rule",
				"version":     "v5",
				"evalWindow":  "24h",
				"frequency":   "3h",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "metrics",
									"stepInterval": 21600,
									"aggregations": []any{map[string]any{"metricName": "otelcol_receiver_accepted_spans", "timeAggregation": "rate", "spaceAggregation": "sum"}},
									"filter":       map[string]any{"expression": "tenant_tier = 'premium'"},
									"groupBy":      []any{map[string]any{"name": "tenant_id", "fieldContext": "attribute", "fieldDataType": "string"}},
									"functions": []any{
										map[string]any{
											"name": "anomaly",
											"args": []any{map[string]any{"name": "z_score_threshold", "value": 2}},
										},
									},
									"legend": "{{tenant_id}}",
								},
							},
						},
					},
					"op":                "below",
					"matchType":         "all_the_times",
					"target":            2,
					"algorithm":         "standard",
					"seasonality":       "daily",
					"selectedQueryName": "A",
					"requireMinPoints":  true,
					"requiredNumPoints": 3,
				},
				"labels":            map[string]any{"severity": "warning"},
				"preferredChannels": []any{"slack-ingestion"},
				"annotations": map[string]any{
					"description": "Ingestion rate for tenant {{$tenant_id}} is anomalously low (z-score {{$value}}).",
					"summary":     "Span ingestion anomaly",
				},
			},
		},
		{
			Name:        "logs_threshold",
			Summary:     "Logs threshold count() over filter",
			Description: "Counts matching log records (ERROR severity + body contains) over a rolling window. Fires at least once per evaluation when the count exceeds zero.",
			Value: map[string]any{
				"alert":         "Payments service panic logs",
				"alertType":     "LOGS_BASED_ALERT",
				"description":   "Any panic log line emitted by the payments service",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "logs",
									"stepInterval": 60,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name = 'payments-api' AND severity_text = 'ERROR' AND body CONTAINS 'panic'"},
									"groupBy": []any{
										map[string]any{"name": "k8s.pod.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"},
									},
									"legend": "{{k8s.pod.name}} ({{deployment.environment}})",
								},
							},
						},
					},
					"selectedQueryName": "A",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "at_least_once",
								"target":    0,
								"channels":  []any{"slack-payments", "pagerduty-payments"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"k8s.pod.name", "deployment.environment"},
					"renotify": renotify("15m", "firing"),
				},
				"labels": map[string]any{"severity": "critical", "team": "payments"},
				"annotations": map[string]any{
					"description": "{{$k8s.pod.name}} emitted {{$value}} panic log(s) in {{$deployment.environment}}.",
					"summary":     "Payments service panic",
				},
			},
		},
		{
			Name:        "logs_error_rate_formula",
			Summary:     "Logs error rate error count / total count × 100",
			Description: "Two disabled log count queries (A = errors, B = total) combined via a builder_formula into a percentage. Classic service-level error-rate alert pattern for log-based signals.",
			Value: map[string]any{
				"alert":         "Payments-api error log rate above 1%",
				"alertType":     "LOGS_BASED_ALERT",
				"description":   "Error log ratio as a percentage of total logs for payments-api",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "percent",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "logs",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name = 'payments-api' AND severity_text IN ['ERROR', 'FATAL']"},
									"groupBy":      []any{map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"}},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "logs",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name = 'payments-api'"},
									"groupBy":      []any{map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"}},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "F1",
									"expression": "(A / B) * 100",
									"legend":     "{{deployment.environment}}",
								},
							},
						},
					},
					"selectedQueryName": "F1",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "at_least_once",
								"target":    1,
								"channels":  []any{"slack-payments"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"deployment.environment"},
					"renotify": renotify("30m", "firing"),
				},
				"labels": map[string]any{"severity": "critical", "team": "payments"},
				"annotations": map[string]any{
					"description": "Error log rate in {{$deployment.environment}} is {{$value}}%",
					"summary":     "Payments-api error rate above {{$threshold}}%",
				},
			},
		},
		{
			Name:        "traces_threshold_latency",
			Summary:     "Traces threshold p99 latency (ns → s conversion)",
			Description: "Builder query against the traces signal with p99(duration_nano). The series unit is ns (compositeQuery.unit), the target is in seconds (threshold.targetUnit) SigNoz converts before comparing. Canonical shape when series and target live in different units.",
			Value: map[string]any{
				"alert":         "Search API p99 latency above 5s",
				"alertType":     "TRACES_BASED_ALERT",
				"description":   "p99 duration of the search endpoint exceeds 5s",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "ns",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "traces",
									"stepInterval": 60,
									"aggregations": []any{map[string]any{"expression": "p99(duration_nano)"}},
									"filter":       map[string]any{"expression": "service.name = 'search-api' AND name = 'GET /api/v1/search'"},
									"groupBy": []any{
										map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "http.route", "fieldContext": "attribute", "fieldDataType": "string"},
									},
									"legend": "{{service.name}} {{http.route}}",
								},
							},
						},
					},
					"selectedQueryName": "A",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":       "warning",
								"op":         "above",
								"matchType":  "at_least_once",
								"target":     5,
								"targetUnit": "s",
								"channels":   []any{"slack-search"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"service.name", "http.route"},
					"renotify": renotify("30m", "firing"),
				},
				"labels": map[string]any{"severity": "warning", "team": "search"},
				"annotations": map[string]any{
					"description": "p99 latency for {{$service.name}} on {{$http.route}} crossed {{$threshold}}s.",
					"summary":     "Search-api latency degraded",
				},
			},
		},
		{
			Name:        "traces_error_rate_formula",
			Summary:     "Traces error rate error spans / total spans × 100",
			Description: "Two disabled trace count queries (A = error spans where hasError=true, B = total spans) combined via a builder_formula into a percentage. Mirrors the common request-error-rate dashboard shape.",
			Value: map[string]any{
				"alert":         "Search-api error rate above 5%",
				"alertType":     "TRACES_BASED_ALERT",
				"description":   "Request error rate for search-api, grouped by route",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "percent",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "traces",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name = 'search-api' AND hasError = true"},
									"groupBy": []any{
										map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "http.route", "fieldContext": "attribute", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "traces",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name = 'search-api'"},
									"groupBy": []any{
										map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "http.route", "fieldContext": "attribute", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "F1",
									"expression": "(A / B) * 100",
									"legend":     "{{service.name}} {{http.route}}",
								},
							},
						},
					},
					"selectedQueryName": "F1",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "at_least_once",
								"target":    5,
								"channels":  []any{"slack-search", "pagerduty-search"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"service.name", "http.route"},
					"renotify": renotify("15m", "firing"),
				},
				"labels": map[string]any{"severity": "critical", "team": "search"},
				"annotations": map[string]any{
					"description": "Error rate on {{$service.name}} {{$http.route}} is {{$value}}%",
					"summary":     "Search-api error rate above {{$threshold}}%",
				},
			},
		},
		{
			Name:        "tiered_thresholds",
			Summary:     "Tiered thresholds with per-tier channels",
			Description: "Two tiers (warning and critical) in a single rule, each with its own target, op, matchType, and channels so warnings and pages route to different receivers. `alertOnAbsent` + `absentFor` fires a no-data alert when the query returns no series for 15 consecutive evaluations.",
			Value: map[string]any{
				"alert":         "Kafka consumer lag warn / critical",
				"alertType":     "METRIC_BASED_ALERT",
				"description":   "Warn at lag ≥ 50 and page at ≥ 200, tiered via thresholds.spec.",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "metrics",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"metricName": "kafka_log_end_offset", "timeAggregation": "max", "spaceAggregation": "max"}},
									"filter":       map[string]any{"expression": "topic != '__consumer_offsets'"},
									"groupBy": []any{
										map[string]any{"name": "topic", "fieldContext": "attribute", "fieldDataType": "string"},
										map[string]any{"name": "partition", "fieldContext": "attribute", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "metrics",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"metricName": "kafka_consumer_committed_offset", "timeAggregation": "max", "spaceAggregation": "max"}},
									"filter":       map[string]any{"expression": "topic != '__consumer_offsets'"},
									"groupBy": []any{
										map[string]any{"name": "topic", "fieldContext": "attribute", "fieldDataType": "string"},
										map[string]any{"name": "partition", "fieldContext": "attribute", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "F1",
									"expression": "A - B",
									"legend":     "{{topic}}/{{partition}}",
								},
							},
						},
					},
					"alertOnAbsent":     true,
					"absentFor":         15,
					"selectedQueryName": "F1",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "warning",
								"op":        "above",
								"matchType": "all_the_times",
								"target":    50,
								"channels":  []any{"slack-kafka-info"},
							},
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "all_the_times",
								"target":    200,
								"channels":  []any{"slack-kafka-alerts", "pagerduty-kafka"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":  []any{"topic"},
					"renotify": renotify("15m", "firing"),
				},
				"labels": map[string]any{"team": "data-platform"},
				"annotations": map[string]any{
					"description": "Consumer lag for {{$topic}} partition {{$partition}} is {{$value}}.",
					"summary":     "Kafka consumer lag",
				},
			},
		},
		{
			Name:        "notification_settings",
			Summary:     "Full notification settings (grouping, nodata renotify, grace period)",
			Description: "Demonstrates the full notificationSettings surface: `groupBy` merges alerts across labels to cut noise, `newGroupEvalDelay` gives newly-appearing series a grace period before firing, `renotify` re-alerts every 30m while firing OR while the alert is in nodata (missing data is treated as actionable), and `usePolicy: false` means channels come from the threshold entries rather than global routing policies. Set `usePolicy: true` to skip per-threshold channels and route via the org-level notification policy instead.",
			Value: map[string]any{
				"alert":         "API 5xx error rate above 1%",
				"alertType":     "TRACES_BASED_ALERT",
				"description":   "Noise-controlled 5xx error rate alert with renotify on gaps",
				"ruleType":      "threshold_rule",
				"version":       "v5",
				"schemaVersion": "v2alpha1",
				"condition": map[string]any{
					"compositeQuery": map[string]any{
						"queryType": "builder",
						"panelType": "graph",
						"unit":      "percent",
						"queries": []any{
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "A",
									"signal":       "traces",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name CONTAINS 'api' AND http.status_code >= 500"},
									"groupBy": []any{
										map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_query",
								"spec": map[string]any{
									"name":         "B",
									"signal":       "traces",
									"stepInterval": 60,
									"disabled":     true,
									"aggregations": []any{map[string]any{"expression": "count()"}},
									"filter":       map[string]any{"expression": "service.name CONTAINS 'api'"},
									"groupBy": []any{
										map[string]any{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"},
										map[string]any{"name": "deployment.environment", "fieldContext": "resource", "fieldDataType": "string"},
									},
								},
							},
							map[string]any{
								"type": "builder_formula",
								"spec": map[string]any{
									"name":       "F1",
									"expression": "(A / B) * 100",
									"legend":     "{{service.name}} ({{deployment.environment}})",
								},
							},
						},
					},
					"selectedQueryName": "F1",
					"thresholds": map[string]any{
						"kind": "basic",
						"spec": []any{
							map[string]any{
								"name":      "critical",
								"op":        "above",
								"matchType": "at_least_once",
								"target":    1,
								"channels":  []any{"slack-api-alerts", "pagerduty-oncall"},
							},
						},
					},
				},
				"evaluation": rolling("5m", "1m"),
				"notificationSettings": map[string]any{
					"groupBy":           []any{"service.name", "deployment.environment"},
					"newGroupEvalDelay": "2m",
					"usePolicy":         false,
					"renotify":          renotify("30m", "firing", "nodata"),
				},
				"labels": map[string]any{"team": "platform"},
				"annotations": map[string]any{
					"description": "{{$service.name}} 5xx rate in {{$deployment.environment}} is {{$value}}%.",
					"summary":     "API service error rate elevated",
				},
			},
		},
	}
}
