package signozapiserver

import "github.com/SigNoz/signoz/pkg/http/handler"

// treemapRequestExamples returns example payloads for the metrics treemap
// endpoint, one per mode.
func treemapRequestExamples() []handler.OpenAPIExample {
	return []handler.OpenAPIExample{
		{
			Name:        "treemap_timeseries",
			Summary:     "Top metrics by time series count",
			Description: "Sizes each metric by the number of distinct time series it produced in the time range, limited to the 50 largest. Only the `timeseries` array of the response is populated.",
			Value: map[string]any{
				"start": 1640995200000,
				"end":   1640998800000,
				"limit": 50,
				"mode":  "timeseries",
			},
		},
		{
			Name:        "treemap_samples_filtered",
			Summary:     "Top metrics by sample count for one host",
			Description: "Sizes each metric by the number of samples ingested, restricted with a query builder filter on a metric attribute. Only the `samples` array of the response is populated.",
			Value: map[string]any{
				"start":  1640995200000,
				"end":    1640998800000,
				"limit":  20,
				"mode":   "samples",
				"filter": map[string]any{"expression": "host.name = 'web-1'"},
			},
		},
	}
}
