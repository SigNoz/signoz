package spanpercentiletypes

type SpanPercentileResponse struct {
	Percentiles PercentileStats    `json:"percentiles"`
	Position    PercentilePosition `json:"position"`
}

type PercentileStats struct {
	P50 float64 `json:"p50"`
	P90 float64 `json:"p90"`
	P99 float64 `json:"p99"`
}

type PercentilePosition struct {
	Percentile  float64 `json:"percentile"`
	Description string  `json:"description"`
}
