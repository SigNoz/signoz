package querybuilder

import (
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type HavingExpressionRewriter struct {
	columnMap map[string]string
}

// NewHavingExpressionRewriter creates a new having expression rewriter.
func NewHavingExpressionRewriter() *HavingExpressionRewriter {
	return &HavingExpressionRewriter{
		columnMap: make(map[string]string),
	}
}

// RewriteForTraces rewrites and validates the HAVING expression for a traces query.
func (r *HavingExpressionRewriter) RewriteForTraces(expression string, aggregations []qbtypes.TraceAggregation) (string, error) {
	if len(strings.TrimSpace(expression)) == 0 {
		return "", nil
	}
	r.buildTraceColumnMap(aggregations)
	return r.rewriteAndValidate(expression)
}

// RewriteForLogs rewrites and validates the HAVING expression for a logs query.
func (r *HavingExpressionRewriter) RewriteForLogs(expression string, aggregations []qbtypes.LogAggregation) (string, error) {
	if len(strings.TrimSpace(expression)) == 0 {
		return "", nil
	}
	r.buildLogColumnMap(aggregations)
	return r.rewriteAndValidate(expression)
}

// RewriteForMetrics rewrites and validates the HAVING expression for a metrics query.
func (r *HavingExpressionRewriter) RewriteForMetrics(expression string, aggregations []qbtypes.MetricAggregation) (string, error) {
	if len(strings.TrimSpace(expression)) == 0 {
		return "", nil
	}
	r.buildMetricColumnMap(aggregations)
	return r.rewriteAndValidate(expression)
}

func (r *HavingExpressionRewriter) buildTraceColumnMap(aggregations []qbtypes.TraceAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		r.columnMap[agg.Expression] = sqlColumn
		if normalized := strings.ReplaceAll(agg.Expression, " ", ""); normalized != agg.Expression {
			r.columnMap[normalized] = sqlColumn
		}

		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

func (r *HavingExpressionRewriter) buildLogColumnMap(aggregations []qbtypes.LogAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		r.columnMap[agg.Expression] = sqlColumn
		if normalized := strings.ReplaceAll(agg.Expression, " ", ""); normalized != agg.Expression {
			r.columnMap[normalized] = sqlColumn
		}

		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

func (r *HavingExpressionRewriter) buildMetricColumnMap(aggregations []qbtypes.MetricAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := "value"

		metricName := agg.MetricName

		if agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.SpaceAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() != "" && agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s(%s))", agg.SpaceAggregation.StringValue(), agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() == "" && agg.SpaceAggregation.StringValue() == "" {
			r.columnMap[metricName] = sqlColumn
		}

		r.columnMap["__result"] = sqlColumn
		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn
	}
}
