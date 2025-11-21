package metricsmoduletypes

// Order specifies column ordering preferences for stats queries.
type OrderBy struct {
	ColumnName string `json:"columnName"`
	Order      string `json:"order"`
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

// MetricStat represents the summary information returned per metric.
type MetricStat struct {
	MetricName   string `json:"metric_name"`
	Description  string `json:"description"`
	MetricType   string `json:"type"`
	MetricUnit   string `json:"unit"`
	TimeSeries   uint64 `json:"timeseries"`
	Samples      uint64 `json:"samples"`
	LastReceived int64  `json:"lastReceived"`
}

// StatsResponse represents the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []MetricStat `json:"metrics"`
	Total   uint64       `json:"total"`
}

type MetricMetadata struct {
	Description string `json:"description"`
	MetricType  string `json:"type"`
	MetricUnit  string `json:"unit"`
	Temporality string `json:"temporality"`
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
	Treemap    TreemapMode `json:"treemap"`
}

// TreemapEntry represents each node in the treemap response.
type TreemapEntry struct {
	MetricName string  `json:"metric_name"`
	Percentage float64 `json:"percentage"`
	TotalValue uint64  `json:"total_value"`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries"`
	Samples    []TreemapEntry `json:"samples"`
}

// MetricAttributesRequest represents the payload for the metric attributes endpoint.
type MetricAttributesRequest struct {
	MetricName string `json:"metricName"`
	Start      int64  `json:"start,omitempty"`
	End        int64  `json:"end,omitempty"`
}

// MetricAttribute represents a single attribute with its values and count.
type MetricAttribute struct {
	Key        string   `json:"key"`
	Value      []string `json:"value"`
	ValueCount uint64   `json:"valueCount"`
}

// MetricAttributesResponse is the output structure for the metric attributes endpoint.
type MetricAttributesResponse struct {
	Attributes []MetricAttribute `json:"attributes"`
}
