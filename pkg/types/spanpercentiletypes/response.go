package spanpercentiletypes

type SpanPercentileResponse struct {
	Percentiles PercentileStats    `json:"percentiles" required:"true"`
	Position    PercentilePosition `json:"position" required:"true"`
}

type PercentileStats struct {
	P50 float64 `json:"p50" required:"true" description:"50th percentile of the compared spans' durations, in nanoseconds."`
	P90 float64 `json:"p90" required:"true" description:"90th percentile of the compared spans' durations, in nanoseconds."`
	P99 float64 `json:"p99" required:"true" description:"99th percentile of the compared spans' durations, in nanoseconds."`
}

type PercentilePosition struct {
	Percentile  float64 `json:"percentile" required:"true" description:"Share of the compared spans, 0 to 100, that were no slower than this one."`
	Description string  `json:"description" required:"true" description:"The position in words, for example: slower than 98.4% of spans."`
}
