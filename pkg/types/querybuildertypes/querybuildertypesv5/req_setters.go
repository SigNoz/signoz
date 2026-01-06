package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

// SetExpression sets the expression string of the spec, if applicable.
func (q *QueryEnvelope) SetExpression(expression string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Expression = expression
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Expression = expression
		q.Spec = spec
	}
}

// SetReturnSpansFrom sets the return-spans-from value, if applicable.
func (q *QueryEnvelope) SetReturnSpansFrom(returnSpansFrom string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.ReturnSpansFrom = returnSpansFrom
		q.Spec = spec
	}
}

// SetSignal sets the signal of the spec, if applicable.
func (q *QueryEnvelope) SetSignal(signal telemetrytypes.Signal) {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		spec.Signal = signal
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Signal = signal
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Signal = signal
		q.Spec = spec
	}
}

// SetSource sets the source of the spec, if applicable.
func (q *QueryEnvelope) SetSource(source telemetrytypes.Source) {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		spec.Source = source
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Source = source
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Source = source
		q.Spec = spec
	}
}

// SetQuery sets the raw query string of the spec, if applicable.
func (q *QueryEnvelope) SetQuery(query string) {
	switch spec := q.Spec.(type) {
	case PromQuery:
		spec.Query = query
		q.Spec = spec
	case ClickHouseQuery:
		spec.Query = query
		q.Spec = spec
	}
}

// SetStep sets the PromQL step size, if applicable.
func (q *QueryEnvelope) SetStep(step Step) {
	switch spec := q.Spec.(type) {
	case PromQuery:
		spec.Step = step
		q.Spec = spec
	}
}

// SetStats sets the PromQL stats flag, if applicable.
func (q *QueryEnvelope) SetStats(stats bool) {
	switch spec := q.Spec.(type) {
	case PromQuery:
		spec.Stats = stats
		q.Spec = spec
	}
}

// SetLeft sets the left query reference of a join, if applicable.
func (q *QueryEnvelope) SetLeft(left QueryRef) {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		spec.Left = left
		q.Spec = spec
	}
}

// SetRight sets the right query reference of a join, if applicable.
func (q *QueryEnvelope) SetRight(right QueryRef) {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		spec.Right = right
		q.Spec = spec
	}
}

// SetJoinType sets the join type, if applicable.
func (q *QueryEnvelope) SetJoinType(joinType JoinType) {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		spec.Type = joinType
		q.Spec = spec
	}
}

// SetOn sets the join ON condition, if applicable.
func (q *QueryEnvelope) SetOn(on string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderJoin:
		spec.On = on
		q.Spec = spec
	}
}

// SetQueryName sets the name of the spec, if applicable.
func (q *QueryEnvelope) SetQueryName(name string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Name = name
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Name = name
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Name = name
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Name = name
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Name = name
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Name = name
		q.Spec = spec
	case PromQuery:
		spec.Name = name
		q.Spec = spec
	case ClickHouseQuery:
		spec.Name = name
		q.Spec = spec
	}
}

// SetDisabled sets the disabled flag of the spec, if applicable.
func (q *QueryEnvelope) SetDisabled(disabled bool) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Disabled = disabled
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Disabled = disabled
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Disabled = disabled
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Disabled = disabled
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Disabled = disabled
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Disabled = disabled
		q.Spec = spec
	case PromQuery:
		spec.Disabled = disabled
		q.Spec = spec
	case ClickHouseQuery:
		spec.Disabled = disabled
		q.Spec = spec
	}
}

// SetLimit sets the row limit of the spec, if applicable.
func (q *QueryEnvelope) SetLimit(limit int) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Limit = limit
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Limit = limit
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Limit = limit
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Limit = limit
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Limit = limit
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Limit = limit
		q.Spec = spec
	}
}

// SetOffset sets the row offset of the spec, if applicable.
func (q *QueryEnvelope) SetOffset(offset int) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Offset = offset
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Offset = offset
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Offset = offset
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Offset = offset
		q.Spec = spec
	}
}

// SetType sets the QueryType of the envelope.
func (q *QueryEnvelope) SetType(t QueryType) {
	q.Type = t
}

// SetOrder sets the order-by clauses of the spec, if applicable.
func (q *QueryEnvelope) SetOrder(order []OrderBy) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Order = order
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Order = order
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Order = order
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Order = order
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Order = order
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Order = order
		q.Spec = spec
	}
}

// SetGroupBy sets the group-by keys of the spec, if applicable.
func (q *QueryEnvelope) SetGroupBy(groupBy []GroupByKey) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.GroupBy = groupBy
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.GroupBy = groupBy
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.GroupBy = groupBy
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.GroupBy = groupBy
		q.Spec = spec
	case QueryBuilderJoin:
		spec.GroupBy = groupBy
		q.Spec = spec
	}
}

// SetFilter sets the filter of the spec, if applicable.
func (q *QueryEnvelope) SetFilter(filter *Filter) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Filter = filter
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Filter = filter
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Filter = filter
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Filter = filter
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Filter = filter
		q.Spec = spec
	}
}

// SetHaving sets the having clause of the spec, if applicable.
func (q *QueryEnvelope) SetHaving(having *Having) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Having = having
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Having = having
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Having = having
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Having = having
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Having = having
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Having = having
		q.Spec = spec
	}
}

// SetFunctions sets the post-processing functions of the spec, if applicable.
func (q *QueryEnvelope) SetFunctions(functions []Function) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Functions = functions
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Functions = functions
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Functions = functions
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Functions = functions
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Functions = functions
		q.Spec = spec
	case QueryBuilderJoin:
		spec.Functions = functions
		q.Spec = spec
	}
}

// SetSelectFields sets the selected fields of the spec, if applicable.
func (q *QueryEnvelope) SetSelectFields(fields []telemetrytypes.TelemetryFieldKey) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.SelectFields = fields
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.SelectFields = fields
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.SelectFields = fields
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.SelectFields = fields
		q.Spec = spec
	case QueryBuilderJoin:
		spec.SelectFields = fields
		q.Spec = spec
	}
}

// SetLegend sets the legend label of the spec, if applicable.
func (q *QueryEnvelope) SetLegend(legend string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Legend = legend
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Legend = legend
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Legend = legend
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Legend = legend
		q.Spec = spec
	case QueryBuilderFormula:
		spec.Legend = legend
		q.Spec = spec
	case PromQuery:
		spec.Legend = legend
		q.Spec = spec
	case ClickHouseQuery:
		spec.Legend = legend
		q.Spec = spec
	}
}

// SetCursor sets the pagination cursor of the spec, if applicable.
func (q *QueryEnvelope) SetCursor(cursor string) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.Cursor = cursor
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.Cursor = cursor
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.Cursor = cursor
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.Cursor = cursor
		q.Spec = spec
	}
}

// SetStepInterval sets the step interval of the spec, if applicable.
func (q *QueryEnvelope) SetStepInterval(step Step) {
	switch spec := q.Spec.(type) {
	case QueryBuilderTraceOperator:
		spec.StepInterval = step
		q.Spec = spec
	case QueryBuilderQuery[TraceAggregation]:
		spec.StepInterval = step
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.StepInterval = step
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.StepInterval = step
		q.Spec = spec
	}
}

// SetSecondaryAggregations sets the secondary aggregations of the spec, if applicable.
func (q *QueryEnvelope) SetSecondaryAggregations(secondaryAggregations []SecondaryAggregation) {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		spec.SecondaryAggregations = secondaryAggregations
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.SecondaryAggregations = secondaryAggregations
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.SecondaryAggregations = secondaryAggregations
		q.Spec = spec
	case QueryBuilderJoin:
		spec.SecondaryAggregations = secondaryAggregations
		q.Spec = spec
	}
}

// SetLimitBy sets the limit-by configuration of the spec, if applicable.
func (q *QueryEnvelope) SetLimitBy(limitBy *LimitBy) {
	switch spec := q.Spec.(type) {
	case QueryBuilderQuery[TraceAggregation]:
		spec.LimitBy = limitBy
		q.Spec = spec
	case QueryBuilderQuery[LogAggregation]:
		spec.LimitBy = limitBy
		q.Spec = spec
	case QueryBuilderQuery[MetricAggregation]:
		spec.LimitBy = limitBy
		q.Spec = spec
	}
}
