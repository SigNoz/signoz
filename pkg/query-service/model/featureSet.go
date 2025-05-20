package model

type FeatureSet []Feature
type Feature struct {
	Name       string `db:"name" json:"name"`
	Active     bool   `db:"active" json:"active"`
	Usage      int64  `db:"usage" json:"usage"`
	UsageLimit int64  `db:"usage_limit" json:"usage_limit"`
	Route      string `db:"route" json:"route"`
}

const UseSpanMetrics = "USE_SPAN_METRICS"
const AnomalyDetection = "ANOMALY_DETECTION"

var BasicPlan = FeatureSet{
	Feature{
		Name:       UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AnomalyDetection,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
