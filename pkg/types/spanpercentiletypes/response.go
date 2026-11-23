package spanpercentiletypes

type SpanPercentileResponse struct {
	Percentiles PercentileStats    `json:"percentiles" required:"true"`
	Position    PercentilePosition `json:"position" required:"true"`
}

type PercentileStats struct {
	P50 float64 `json:"p50" required:"true" description:"In nanoseconds."`
	P90 float64 `json:"p90" required:"true" description:"In nanoseconds."`
	P99 float64 `json:"p99" required:"true" description:"In nanoseconds."`
}

type PercentilePosition struct {
	Percentile  float64 `json:"percentile" required:"true" description:"The share of the spans, 0 to 100, that were no slower than this one."`
	Description string  `json:"description" required:"true"`
}
