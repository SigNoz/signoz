package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

// GetExpression returns the expression string. Panics for Join, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetExpression() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Expression
	case QueryBuilderFormula:
		return spec.Expression
	}
	panic("unsupported spec type")
}

// GetReturnSpansFrom returns the return-spans-from value. Panics for all types except TraceOperator.
func (q *QueryEnvelope) GetReturnSpansFrom() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.ReturnSpansFrom
	}
	panic("unsupported spec type")
}

// GetSignal returns the signal. Panics for all types except Query[T].
func (q *QueryEnvelope) GetSignal() telemetrytypes.Signal {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Signal
	case QueryBuilderQuery[LogAggregation]:
		return spec.Signal
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Signal
	}
	panic("unsupported spec type")
}

// GetSource returns the source. Panics for all types except Query[T].
func (q *QueryEnvelope) GetSource() telemetrytypes.Source {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Source
	case QueryBuilderQuery[LogAggregation]:
		return spec.Source
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Source
	}
	panic("unsupported spec type")
}

// GetQuery returns the raw query string. Panics for all types except PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetQuery() string {
	switch spec := q.Spec.(type) {
	case PromQuery:
		return spec.Query
	case ClickHouseQuery:
		return spec.Query
	}
	panic("unsupported spec type")
}

// GetStep returns the PromQL step size. Panics for all types except PromQuery.
func (q *QueryEnvelope) GetStep() Step {
	switch spec := q.Spec.(type) {
	case PromQuery:
		return spec.Step
	}
	panic("unsupported spec type")
}

// GetStats returns the PromQL stats flag. Panics for all types except PromQuery.
func (q *QueryEnvelope) GetStats() bool {
	switch spec := q.Spec.(type) {
	case PromQuery:
		return spec.Stats
	}
	panic("unsupported spec type")
}

// GetLeft returns the left query reference of a join. Panics for all types except QueryBuilderJoin.
func (q *QueryEnvelope) GetLeft() QueryRef {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Left
	}
	panic("unsupported spec type")
}

// GetRight returns the right query reference of a join. Panics for all types except QueryBuilderJoin.
func (q *QueryEnvelope) GetRight() QueryRef {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Right
	}
	panic("unsupported spec type")
}

// GetJoinType returns the join type. Panics for all types except QueryBuilderJoin.
func (q *QueryEnvelope) GetJoinType() JoinType {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Type
	}
	panic("unsupported spec type")
}

// GetOn returns the join ON condition. Panics for all types except QueryBuilderJoin.
func (q *QueryEnvelope) GetOn() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.On
	}
	panic("unsupported spec type")
}

// GetQueryName returns the name of the spec.
func (q *QueryEnvelope) GetQueryName() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Name
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Name
	case QueryBuilderQuery[LogAggregation]:
		return spec.Name
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Name
	case QueryBuilderFormula:
		return spec.Name
	case QueryBuilderJoin:
		return spec.Name
	case PromQuery:
		return spec.Name
	case ClickHouseQuery:
		return spec.Name
	}
	panic("unsupported spec type")
}

// GetDisabled returns whether the spec is disabled.
func (q *QueryEnvelope) GetDisabled() bool {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Disabled
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Disabled
	case QueryBuilderQuery[LogAggregation]:
		return spec.Disabled
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Disabled
	case QueryBuilderFormula:
		return spec.Disabled
	case QueryBuilderJoin:
		return spec.Disabled
	case PromQuery:
		return spec.Disabled
	case ClickHouseQuery:
		return spec.Disabled
	}
	panic("unsupported spec type")
}

// GetLimit returns the row limit. Panics for PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetLimit() int {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Limit
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Limit
	case QueryBuilderQuery[LogAggregation]:
		return spec.Limit
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Limit
	case QueryBuilderFormula:
		return spec.Limit
	case QueryBuilderJoin:
		return spec.Limit
	}
	panic("unsupported spec type")
}

// GetOffset returns the row offset. Panics for Formula, Join, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetOffset() int {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Offset
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Offset
	case QueryBuilderQuery[LogAggregation]:
		return spec.Offset
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Offset
	}
	panic("unsupported spec type")
}

// GetType returns the QueryType of the envelope.
func (q *QueryEnvelope) GetType() QueryType {
	return q.Type
}

// GetOrder returns the order-by clauses. Panics for PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetOrder() []OrderBy {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Order
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Order
	case QueryBuilderQuery[LogAggregation]:
		return spec.Order
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Order
	case QueryBuilderFormula:
		return spec.Order
	case QueryBuilderJoin:
		return spec.Order
	}
	panic("unsupported spec type")
}

// GetGroupBy returns the group-by keys. Panics for Formula, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetGroupBy() []GroupByKey {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.GroupBy
	case QueryBuilderQuery[TraceAggregation]:
		return spec.GroupBy
	case QueryBuilderQuery[LogAggregation]:
		return spec.GroupBy
	case QueryBuilderQuery[MetricAggregation]:
		return spec.GroupBy
	case QueryBuilderJoin:
		return spec.GroupBy
	}
	panic("unsupported spec type")
}

// GetFilter returns the filter. Panics for Formula, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetFilter() *Filter {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Filter
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Filter
	case QueryBuilderQuery[LogAggregation]:
		return spec.Filter
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Filter
	case QueryBuilderJoin:
		return spec.Filter
	}
	panic("unsupported spec type")
}

// GetHaving returns the having clause. Panics for PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetHaving() *Having {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Having
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Having
	case QueryBuilderQuery[LogAggregation]:
		return spec.Having
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Having
	case QueryBuilderFormula:
		return spec.Having
	case QueryBuilderJoin:
		return spec.Having
	}
	panic("unsupported spec type")
}

// GetFunctions returns the post-processing functions. Panics for PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetFunctions() []Function {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Functions
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Functions
	case QueryBuilderQuery[LogAggregation]:
		return spec.Functions
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Functions
	case QueryBuilderFormula:
		return spec.Functions
	case QueryBuilderJoin:
		return spec.Functions
	}
	panic("unsupported spec type")
}

// GetSelectFields returns the selected fields. Panics for Formula, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetSelectFields() []telemetrytypes.TelemetryFieldKey {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.SelectFields
	case QueryBuilderQuery[TraceAggregation]:
		return spec.SelectFields
	case QueryBuilderQuery[LogAggregation]:
		return spec.SelectFields
	case QueryBuilderQuery[MetricAggregation]:
		return spec.SelectFields
	case QueryBuilderJoin:
		return spec.SelectFields
	}
	panic("unsupported spec type")
}

// GetLegend returns the legend label. Panics for QueryBuilderJoin.
func (q *QueryEnvelope) GetLegend() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Legend
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Legend
	case QueryBuilderQuery[LogAggregation]:
		return spec.Legend
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Legend
	case QueryBuilderFormula:
		return spec.Legend
	case PromQuery:
		return spec.Legend
	case ClickHouseQuery:
		return spec.Legend
	}
	panic("unsupported spec type")
}

// GetCursor returns the pagination cursor. Panics for Formula, Join, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetCursor() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Cursor
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Cursor
	case QueryBuilderQuery[LogAggregation]:
		return spec.Cursor
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Cursor
	}
	panic("unsupported spec type")
}

// GetStepInterval returns the step interval. Panics for Formula, Join, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetStepInterval() Step {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.StepInterval
	case QueryBuilderQuery[TraceAggregation]:
		return spec.StepInterval
	case QueryBuilderQuery[LogAggregation]:
		return spec.StepInterval
	case QueryBuilderQuery[MetricAggregation]:
		return spec.StepInterval
	}
	panic("unsupported spec type")
}

// GetSecondaryAggregations returns the secondary aggregations. Panics for TraceOperator, Formula, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetSecondaryAggregations() []SecondaryAggregation {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.SecondaryAggregations
	case QueryBuilderQuery[LogAggregation]:
		return spec.SecondaryAggregations
	case QueryBuilderQuery[MetricAggregation]:
		return spec.SecondaryAggregations
	case QueryBuilderJoin:
		return spec.SecondaryAggregations
	}
	panic("unsupported spec type")
}

// GetLimitBy returns the limit-by configuration. Panics for TraceOperator, Formula, Join, PromQuery and ClickHouseQuery.
func (q *QueryEnvelope) GetLimitBy() *LimitBy {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.LimitBy
	case QueryBuilderQuery[LogAggregation]:
		return spec.LimitBy
	case QueryBuilderQuery[MetricAggregation]:
		return spec.LimitBy
	}
	panic("unsupported spec type")
}
