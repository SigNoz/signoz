package querybuildertypesv5

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// JoinType is the SQL‐style join operator.
type JoinType struct{ valuer.String }

var (
	JoinTypeInner = JoinType{valuer.NewString("inner")}
	JoinTypeLeft  = JoinType{valuer.NewString("left")}
	JoinTypeRight = JoinType{valuer.NewString("right")}
	JoinTypeFull  = JoinType{valuer.NewString("full")}
	JoinTypeCross = JoinType{valuer.NewString("cross")}
)

type QueryRef struct {
	Name string `json:"name"`
}

type QueryBuilderJoin struct {
	Name     string `json:"name"`
	Disabled bool   `json:"disabled,omitempty"`

	// references into flat registry of queries
	Left  QueryRef `json:"left"`
	Right QueryRef `json:"right"`

	// join type + condition ON
	Type JoinType `json:"type"`
	On   string   `json:"on"`

	// primary aggregations: if empty ⇒ raw columns
	// currently supported: []Aggregation, []MetricAggregation
	Aggregations []any `json:"aggregations,omitempty"`
	// select columns to select
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitempty"`

	// post-join clauses (also used for aggregated joins)
	Filter                *Filter                `json:"filter,omitempty"`
	GroupBy               []GroupByKey           `json:"groupBy,omitempty"`
	Having                *Having                `json:"having,omitempty"`
	Order                 []OrderBy              `json:"order,omitempty"`
	Limit                 int                    `json:"limit,omitempty"`
	SecondaryAggregations []SecondaryAggregation `json:"secondaryAggregations,omitempty"`
	Functions             []Function             `json:"functions,omitempty"`
}
