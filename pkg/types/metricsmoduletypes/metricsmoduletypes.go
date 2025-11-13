package metricsmoduletypes

// Order specifies column ordering preferences for stats queries.
type OrderBy struct {
	Column string `json:"column"`
	Order  string `json:"order"`
}

// StatsRequest represents the payload accepted by the metrics stats endpoint.
type StatsRequest struct {
	Expression string   `json:"expression"`
	Start      int64    `json:"start"`
	End        int64    `json:"end"`
	Limit      int      `json:"limit"`
	Offset     int      `json:"offset"`
	OrderBy    *OrderBy `json:"orderBy,omitempty"`
}

// MetricStat mirrors the summary information returned per metric.
type MetricStat struct {
	MetricName   string `json:"metricName"`
	Description  string `json:"description"`
	MetricType   string `json:"type"`
	MetricUnit   string `json:"unit"`
	TimeSeries   uint64 `json:"timeseries"`
	Samples      uint64 `json:"samples"`
	LastReceived int64  `json:"lastReceived"`
}

// StatsResponse captures the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []MetricStat `json:"metrics"`
	Total   uint64       `json:"total"`
}

// TreemapMode indicates which treemap variant the caller requests.
type TreemapMode string

const (
	// TreemapModeTimeSeries represents the treemap based on timeseries counts.
	TreemapModeTimeSeries TreemapMode = "timeseries"
	// TreemapModeSamples represents the treemap based on sample counts.
	TreemapModeSamples TreemapMode = "samples"
)

// TreemapRequest represents the payload for the metrics treemap endpoint.
type TreemapRequest struct {
	Expression string      `json:"expression"`
	Start      int64       `json:"start"`
	End        int64       `json:"end"`
	Limit      int         `json:"limit"`
	Mode       TreemapMode `json:"mode"`
}

// TreemapEntry represents each node in the treemap response.
type TreemapEntry struct {
	MetricName string  `json:"metricName"`
	Percentage float64 `json:"percentage"`
	TotalValue uint64  `json:"totalValue"`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries,omitempty"`
	Samples    []TreemapEntry `json:"samples,omitempty"`
}
