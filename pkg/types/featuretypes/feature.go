package featuretypes

import "github.com/uptrace/bun"

type FeatureSet []*GettableFeature
type GettableFeature struct {
	Name       string `db:"name" json:"name"`
	Active     bool   `db:"active" json:"active"`
	Usage      int64  `db:"usage" json:"usage"`
	UsageLimit int64  `db:"usage_limit" json:"usage_limit"`
	Route      string `db:"route" json:"route"`
}

type StorableFeature struct {
	bun.BaseModel `bun:"table:feature_status"`

	Name       string `bun:"name,pk,type:text" json:"name"`
	Active     bool   `bun:"active" json:"active"`
	Usage      int    `bun:"usage,default:0" json:"usage"`
	UsageLimit int    `bun:"usage_limit,default:0" json:"usage_limit"`
	Route      string `bun:"route,type:text" json:"route"`
}

func NewStorableFeature() {}

const UseSpanMetrics = "USE_SPAN_METRICS"
const AnomalyDetection = "ANOMALY_DETECTION"
const TraceFunnels = "TRACE_FUNNELS"
