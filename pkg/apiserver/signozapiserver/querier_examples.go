package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// timeSeriesExample wraps builder query specs in a one hour time series
// request, the shape every function example shares.
func timeSeriesExample(name, summary, description string, queries ...map[string]any) handler.OpenAPIExample {
	list := make([]any, 0, len(queries))
	for _, query := range queries {
		list = append(list, query)
	}
	return handler.OpenAPIExample{
		Name:        name,
		Summary:     summary,
		Description: description,
		Value: map[string]any{
			"schemaVersion":  "v1",
			"start":          1640995200000,
			"end":            1640998800000,
			"requestType":    "time_series",
			"compositeQuery": map[string]any{"queries": list},
		},
	}
}

func builderQueryEnvelope(spec map[string]any) map[string]any {
	return map[string]any{"type": "builder_query", "spec": spec}
}

// function builds a function entry with positional arguments; anomaly is the
// one function that takes named arguments and is written out in full.
func function(name string, args ...any) map[string]any {
	list := make([]any, 0, len(args))
	for _, arg := range args {
		list = append(list, map[string]any{"value": arg})
	}
	entry := map[string]any{"name": name}
	if len(list) > 0 {
		entry["args"] = list
	}
	return entry
}

// queryRangeFunctionExamples shows every function a builder query can carry,
// what its arguments mean and the values they take. Functions run in the
// order listed, after the aggregation and before formulas.
func queryRangeFunctionExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		timeSeriesExample(
			"function_timeshift_week_over_week",
			"timeShift: this week's error logs next to last week's",
			"timeShift moves every point of its query forward by the argument, in seconds, so a series read from the past lands on the current timestamps. B here reads the hour exactly seven days (604800 s) before the requested window and comes back on this week's timestamps, so it overlays A on a chart and the formula can subtract it point by point. The argument is positive; it says how far back to read.",
			builderQueryEnvelope(map[string]any{
				"name":         "A",
				"signal":       "logs",
				"aggregations": []any{map[string]any{"expression": "count()", "alias": "errors"}},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "severity_text = 'ERROR'"},
			}),
			builderQueryEnvelope(map[string]any{
				"name":         "B",
				"signal":       "logs",
				"aggregations": []any{map[string]any{"expression": "count()", "alias": "errors"}},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "severity_text = 'ERROR'"},
				"functions":    []any{function("timeShift", 604800)},
			}),
			map[string]any{
				"type": "builder_formula",
				"spec": map[string]any{"name": "F1", "expression": "A - B"},
			},
		),
		timeSeriesExample(
			"function_fillzero_sparse_errors",
			"fillZero: a zero at every step with no failed spans",
			"A count over sparse events returns a point only for steps that had a match, so a chart of failed spans has gaps where nothing failed. fillZero adds a zero at every missing step. With no arguments the server fills the request window at the query's step, which is the common case. The three optional arguments are start, end and step in milliseconds, for callers that want to fill a different grid.",
			builderQueryEnvelope(map[string]any{
				"name":         "A",
				"signal":       "traces",
				"aggregations": []any{map[string]any{"expression": "count()", "alias": "failed_spans"}},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "has_error = true"},
				"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
				"functions":    []any{function("fillZero")},
			}),
		),
		timeSeriesExample(
			"function_cutoffmin_hide_idle_hosts",
			"cutOffMin: drop hosts below 5% CPU from the chart",
			"The four threshold functions take one number. cutOffMin and cutOffMax remove the points below or above the threshold, so an idle host disappears from the chart instead of drawing a line along the bottom. clampMin and clampMax keep the points and replace the value with the threshold, which caps spikes without hiding them. system.cpu.utilization is a ratio, so 0.05 is 5%.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "system.cpu.utilization", "timeAggregation": "avg", "spaceAggregation": "avg"},
				},
				"stepInterval": "60s",
				"groupBy":      []any{map[string]any{"name": "host.name", "fieldContext": "resource"}},
				"functions":    []any{function("cutOffMin", 0.05)},
			}),
		),
		timeSeriesExample(
			"function_runningdiff_disk_growth",
			"runningDiff then clampMin: bytes written to disk per step",
			"runningDiff turns a gauge into the change between consecutive points, so a filesystem usage gauge becomes bytes written per step. It takes no arguments and drops the first point of the window, since that point has nothing to difference against; the server reads one step before the window to keep the first interval. Functions apply in order: clampMin with 0 runs on the differences and replaces the negative value a cleanup or a volume reset produces with zero.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "system.filesystem.usage", "timeAggregation": "latest", "spaceAggregation": "sum"},
				},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "state = 'used'"},
				"groupBy":      []any{map[string]any{"name": "host.name", "fieldContext": "resource"}},
				"functions":    []any{function("runningDiff"), function("clampMin", 0)},
			}),
		),
		timeSeriesExample(
			"function_ewma_smoothed_latency",
			"ewma5: smoothed p95 latency",
			"ewma3, ewma5 and ewma7 replace each point with an exponentially weighted average of the point and the points before it. The number in the name is the window the default weight is derived from: alpha = 2 / (n + 1), so 0.5, 0.333 and 0.25. One optional argument overrides alpha; a value close to 1 follows the raw series, a value close to 0 smooths harder. 0.3 here smooths a little more than ewma5's default.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "http.server.duration.bucket", "spaceAggregation": "p95"},
				},
				"stepInterval": "60s",
				"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
				"functions":    []any{function("ewma5", 0.3)},
			}),
		),
		timeSeriesExample(
			"function_median_despiked_request_rate",
			"median5: request rate without one-step spikes",
			"median3, median5 and median7 replace each point with the median of the surrounding 3, 5 or 7 points. A spike that lasts one step vanishes, a shift that lasts longer than half the window stays. They take no arguments. Use them when the raw series is noisy and the chart is for a trend, not for catching the spike.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "http.server.duration.count", "timeAggregation": "rate", "spaceAggregation": "sum"},
				},
				"stepInterval": "60s",
				"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
				"functions":    []any{function("median5")},
			}),
		),
		timeSeriesExample(
			"function_cumulativesum_errors_so_far",
			"cumulativeSum: 5xx responses since the start of the window",
			"cumulativeSum replaces each point with the sum of every point up to it, so a per-step count becomes a running total that starts at zero at the window start. It takes no arguments. The total resets with the window, so a longer time range gives a larger final value; it is a view of the window, not a counter.",
			builderQueryEnvelope(map[string]any{
				"name":         "A",
				"signal":       "traces",
				"aggregations": []any{map[string]any{"expression": "count()", "alias": "server_errors"}},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "http.response.status_code >= 500"},
				"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
				"functions":    []any{function("cumulativeSum")},
			}),
		),
		timeSeriesExample(
			"function_log10_network_bytes",
			"log10: network throughput across devices that differ by orders of magnitude",
			"log2 and log10 replace each value with its logarithm, so a loopback device moving kilobytes and an uplink moving gigabytes fit on one chart. They take no arguments. Zero and negative values have no logarithm and are not drawn. absolute, also without arguments, is the usual companion for a signed series before a logarithm.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "system.network.io", "timeAggregation": "rate", "spaceAggregation": "sum"},
				},
				"stepInterval": "60s",
				"filter":       map[string]any{"expression": "direction = 'transmit'"},
				"groupBy":      []any{map[string]any{"name": "device", "fieldContext": "attribute"}},
				"functions":    []any{function("log10")},
			}),
		),
		timeSeriesExample(
			"function_anomaly_request_rate",
			"anomaly: request rate scored against its daily pattern",
			"anomaly is the one function with named arguments. seasonality says which past periods predict the current value: hourly, daily or weekly, daily when absent. z_score_threshold is how many standard deviations from the prediction count as an anomaly, 3 when absent. The response carries, next to the values, a predicted series, an upper and a lower bound series and an anomaly score series. The scoring runs in the enterprise build; the community build returns the series unchanged.",
			builderQueryEnvelope(map[string]any{
				"name":   "A",
				"signal": "metrics",
				"aggregations": []any{
					map[string]any{"metricName": "http.server.duration.count", "timeAggregation": "rate", "spaceAggregation": "sum"},
				},
				"stepInterval": "300s",
				"groupBy":      []any{map[string]any{"name": "service.name", "fieldContext": "resource"}},
				"functions": []any{
					map[string]any{
						"name": "anomaly",
						"args": []any{
							map[string]any{"name": "seasonality", "value": "daily"},
							map[string]any{"name": "z_score_threshold", "value": 3},
						},
					},
				},
			}),
		),
	}
}
