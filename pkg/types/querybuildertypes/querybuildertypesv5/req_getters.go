package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

// GetExpression returns the expression string.
func (q *QueryEnvelope) GetExpression() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.Expression
	case QueryBuilderFormula:
		return spec.Expression
	}
	return ""
}

// GetReturnSpansFrom returns the return-spans-from value.
func (q *QueryEnvelope) GetReturnSpansFrom() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		return spec.ReturnSpansFrom
	}
	return ""
}

// GetSignal returns the signal.
func (q *QueryEnvelope) GetSignal() telemetrytypes.Signal {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Signal
	case QueryBuilderQuery[LogAggregation]:
		return spec.Signal
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Signal
	}
	return telemetrytypes.SignalUnspecified
}

// GetSource returns the source.
func (q *QueryEnvelope) GetSource() telemetrytypes.Source {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.Source
	case QueryBuilderQuery[LogAggregation]:
		return spec.Source
	case QueryBuilderQuery[MetricAggregation]:
		return spec.Source
	}
	return telemetrytypes.SourceUnspecified
}

// GetQuery returns the raw query string.
func (q *QueryEnvelope) GetQuery() string {
	switch spec := q.Spec.(type) {
	case PromQuery:
		return spec.Query
	case ClickHouseQuery:
		return spec.Query
	}
	return ""
}

// GetStats returns the PromQL stats flag.
func (q *QueryEnvelope) GetStats() bool {
	switch spec := q.Spec.(type) {
	case PromQuery:
		return spec.Stats
	}
	return false
}

// GetLeft returns the left query reference of a join.
func (q *QueryEnvelope) GetLeft() QueryRef {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Left
	}
	return QueryRef{}
}

// GetRight returns the right query reference of a join.
func (q *QueryEnvelope) GetRight() QueryRef {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Right
	}
	return QueryRef{}
}

// GetJoinType returns the join type.
func (q *QueryEnvelope) GetJoinType() JoinType {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.Type
	}
	return JoinType{}
}

// GetOn returns the join ON condition.
func (q *QueryEnvelope) GetOn() string {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		return spec.On
	}
	return ""
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
	return ""
}

// IsDisabled returns whether the spec is disabled.
func (q *QueryEnvelope) IsDisabled() bool {
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
	return false
}

// GetLimit returns the row limit.
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
	return 0
}

// GetOffset returns the row offset.
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
	return 0
}

// GetType returns the QueryType of the envelope.
func (q *QueryEnvelope) GetType() QueryType {
	return q.Type
}

// GetOrder returns the order-by clauses.
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
	return nil
}

// GetGroupBy returns the group-by keys.
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
	return nil
}

// GetFilter returns the filter.
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
	return nil
}

// GetHaving returns the having clause.
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
	return nil
}

// GetFunctions returns the post-processing functions.
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
	return nil
}

// GetSelectFields returns the selected fields.
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
	return nil
}

// GetLegend returns the legend label.
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
	return ""
}

// GetCursor returns the pagination cursor.
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
	return ""
}

// GetStepInterval returns the step interval.
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
	case PromQuery:
		return spec.Step
	}
	return Step{}
}

// GetSecondaryAggregations returns the secondary aggregations.
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
	return nil
}

// GetLimitBy returns the limit-by configuration.
func (q *QueryEnvelope) GetLimitBy() *LimitBy {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		return spec.LimitBy
	case QueryBuilderQuery[LogAggregation]:
		return spec.LimitBy
	case QueryBuilderQuery[MetricAggregation]:
		return spec.LimitBy
	}
	return nil
}
