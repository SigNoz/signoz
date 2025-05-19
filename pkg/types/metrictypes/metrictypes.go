package metrictypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Temporality is the temporality of the metric specified in OTLP data model
// Read more here https://opentelemetry.io/docs/specs/otel/metrics/data-model/#temporality
type Temporality struct {
	valuer.String
}

var (
	Delta       = Temporality{valuer.NewString("delta")}
	Cumulative  = Temporality{valuer.NewString("cumulative")}
	Unspecified = Temporality{valuer.NewString("")}
)

// Type is the type of the metric in OTLP data model
// Read more here https://opentelemetry.io/docs/specs/otel/metrics/data-model/#metric-points
type Type struct {
	valuer.String
}

var (
	GaugeType        = Type{valuer.NewString("gauge")}
	SumType          = Type{valuer.NewString("sum")}
	HistogramType    = Type{valuer.NewString("histogram")}
	SummaryType      = Type{valuer.NewString("summary")}
	ExpHistogramType = Type{valuer.NewString("exponential_histogram")}
	UnspecifiedType  = Type{valuer.NewString("")}
)

type TimeAggregation struct {
	valuer.String
}

var (
	TimeAggregationUnspecified   = TimeAggregation{valuer.NewString("")}
	TimeAggregationLatest        = TimeAggregation{valuer.NewString("latest")}
	TimeAggregationSum           = TimeAggregation{valuer.NewString("sum")}
	TimeAggregationAvg           = TimeAggregation{valuer.NewString("avg")}
	TimeAggregationMin           = TimeAggregation{valuer.NewString("min")}
	TimeAggregationMax           = TimeAggregation{valuer.NewString("max")}
	TimeAggregationCount         = TimeAggregation{valuer.NewString("count")}
	TimeAggregationCountDistinct = TimeAggregation{valuer.NewString("count_distinct")}
	TimeAggregationRate          = TimeAggregation{valuer.NewString("rate")}
	TimeAggregationIncrease      = TimeAggregation{valuer.NewString("increase")}
)

type SpaceAggregation struct {
	valuer.String
}

var (
	SpaceAggregationUnspecified  = SpaceAggregation{valuer.NewString("")}
	SpaceAggregationSum          = SpaceAggregation{valuer.NewString("sum")}
	SpaceAggregationAvg          = SpaceAggregation{valuer.NewString("avg")}
	SpaceAggregationMin          = SpaceAggregation{valuer.NewString("min")}
	SpaceAggregationMax          = SpaceAggregation{valuer.NewString("max")}
	SpaceAggregationCount        = SpaceAggregation{valuer.NewString("count")}
	SpaceAggregationPercentile50 = SpaceAggregation{valuer.NewString("p50")}
	SpaceAggregationPercentile75 = SpaceAggregation{valuer.NewString("p75")}
	SpaceAggregationPercentile90 = SpaceAggregation{valuer.NewString("p90")}
	SpaceAggregationPercentile95 = SpaceAggregation{valuer.NewString("p95")}
	SpaceAggregationPercentile99 = SpaceAggregation{valuer.NewString("p99")}
)
