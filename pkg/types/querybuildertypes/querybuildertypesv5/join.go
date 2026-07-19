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

// Enum returns the acceptable values for JoinType.
func (JoinType) Enum() []any {
	return []any{
		JoinTypeInner,
		JoinTypeLeft,
		JoinTypeRight,
		JoinTypeFull,
		JoinTypeCross,
	}
}

type QueryRef struct {
	Name string `json:"name"`
}

// Copy creates a deep copy of QueryRef.
func (q QueryRef) Copy() QueryRef {
	return q
}

type QueryBuilderJoin struct {
	Name     string `json:"name"`
	Disabled bool   `json:"disabled"`

	// references into flat registry of queries
	Left  QueryRef `json:"left"`
	Right QueryRef `json:"right"`

	// join type + condition ON
	Type JoinType `json:"type"`
	On   string   `json:"on"`

	// primary aggregations: if empty ⇒ raw columns. Untyped — joins are deferred
	// (see the commented JoinAggregation below).
	Aggregations []any `json:"aggregations,omitzero"`
	// select columns to select
	SelectFields []telemetrytypes.TelemetryFieldKey `json:"selectFields,omitzero"`

	// post-join clauses (also used for aggregated joins)
	Filter                *Filter                `json:"filter,omitempty"`
	GroupBy               []GroupByKey           `json:"groupBy,omitzero"`
	Having                *Having                `json:"having,omitempty"`
	Order                 []OrderBy              `json:"order,omitzero"`
	Limit                 int                    `json:"limit,omitempty"`
	SecondaryAggregations []SecondaryAggregation `json:"secondaryAggregations,omitzero"`
	Functions             []Function             `json:"functions,omitzero"`
}

// JoinAggregation modelled a join aggregation as a trace/log/metric oneOf. Deferred:
// that oneOf has no discriminator (trace ≡ log, and a join carries no `signal`), so
// code generators can't map it. TODO: add a discriminator before re-enabling.
//
// type JoinAggregation struct {
// 	value any
// }
//
// var _ jsonschema.OneOfExposer = JoinAggregation{}
//
// func (JoinAggregation) JSONSchemaOneOf() []any {
// 	return []any{
// 		TraceAggregation{},
// 		LogAggregation{},
// 		MetricAggregation{},
// 	}
// }
//
// func (j JoinAggregation) MarshalJSON() ([]byte, error) {
// 	return json.Marshal(j.value)
// }
//
// func (j *JoinAggregation) UnmarshalJSON(data []byte) error {
// 	return json.Unmarshal(data, &j.value)
// }

// Copy creates a deep copy of QueryBuilderJoin.
func (q QueryBuilderJoin) Copy() QueryBuilderJoin {
	c := q

	// deep copy value types
	c.Left = q.Left.Copy()
	c.Right = q.Right.Copy()

	if q.Aggregations != nil {
		c.Aggregations = make([]any, len(q.Aggregations))
		copy(c.Aggregations, q.Aggregations)
	}

	if q.SelectFields != nil {
		c.SelectFields = make([]telemetrytypes.TelemetryFieldKey, len(q.SelectFields))
		copy(c.SelectFields, q.SelectFields)
	}

	if q.GroupBy != nil {
		c.GroupBy = make([]GroupByKey, len(q.GroupBy))
		for i, gb := range q.GroupBy {
			c.GroupBy[i] = gb.Copy()
		}
	}

	if q.Order != nil {
		c.Order = make([]OrderBy, len(q.Order))
		for i, o := range q.Order {
			c.Order[i] = o.Copy()
		}
	}

	if q.SecondaryAggregations != nil {
		c.SecondaryAggregations = make([]SecondaryAggregation, len(q.SecondaryAggregations))
		for i, sa := range q.SecondaryAggregations {
			c.SecondaryAggregations[i] = sa.Copy()
		}
	}

	if q.Functions != nil {
		c.Functions = make([]Function, len(q.Functions))
		for i, f := range q.Functions {
			c.Functions[i] = f.Copy()
		}
	}

	if q.Filter != nil {
		c.Filter = q.Filter.Copy()
	}

	if q.Having != nil {
		c.Having = q.Having.Copy()
	}

	return c
}
