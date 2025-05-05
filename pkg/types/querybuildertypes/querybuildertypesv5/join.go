package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

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
	Aggregations       []Aggregation       `json:"aggregations,omitempty"`
	MetricAggregations []MetricAggregation `json:"metricAggregations,omitempty"`

	// post-join clauses (also used for aggregated joins)
	Filter               Filter                 `json:"filter,omitempty"`
	GroupBy              []GroupByKey           `json:"groupBy,omitempty"`
	Having               Having                 `json:"having,omitempty"`
	Order                []OrderBy              `json:"order,omitempty"`
	Limit                int                    `json:"limit,omitempty"`
	SecondaryAggregation []SecondaryAggregation `json:"secondaryAggregation,omitempty"`
	Functions            []Function             `json:"functions,omitempty"`
}
