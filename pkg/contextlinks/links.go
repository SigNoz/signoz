package contextlinks

import (
	"encoding/json"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// PrepareParamsForTracesV5 returns the traces explorer query params for the
// given range and filter; the traces explorer writes its time params in
// nanoseconds. queryType is builder_ai_query for the AI observability explorer.
func PrepareParamsForTracesV5(start, end time.Time, whereClause string, queryType qbtypes.QueryType) url.Values {
	return prepareExplorerParams("traces", queryType, start.UnixNano(), end.UnixNano(), whereClause)
}

// PrepareParamsForLogsV5 returns the logs explorer query params for the given
// range and filter; the logs explorer writes its time params in milliseconds.
func PrepareParamsForLogsV5(start, end time.Time, whereClause string) url.Values {
	return prepareExplorerParams("logs", qbtypes.QueryTypeBuilder, start.UnixMilli(), end.UnixMilli(), whereClause)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, queryType qbtypes.QueryType, start, end int64, whereClause string) url.Values {
	// builder_query is the explorer default, so it is left out to keep existing links unchanged
	builderQueryType := ""
	if queryType != qbtypes.QueryTypeBuilder {
		builderQueryType = queryType.StringValue()
	}

	urlData := URLShareableCompositeQuery{
		QueryType: "builder",
		Builder: URLShareableBuilderQuery{
			QueryData: []LinkQuery{{
				DataSource:       dataSource,
				BuilderQueryType: builderQueryType,
				Filter:           &FilterExpression{Expression: whereClause},
			}},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)

	params := url.Values{}
	params.Set("compositeQuery", url.QueryEscape(string(data)))
	params.Set("startTime", strconv.FormatInt(start, 10))
	params.Set("endTime", strconv.FormatInt(end, 10))
	return params
}

func PrepareRuleFilterExpression(condition *ruletypes.RuleCondition, signal telemetrytypes.Signal, labels map[string]string) (string, bool, error) {
	var expressions []string
	if condition != nil && condition.CompositeQuery != nil {
		names, err := resolveSelectedQueryNames(condition)
		if err != nil {
			return "", false, err
		}
		switch signal {
		case telemetrytypes.SignalLogs:
			expressions = prepareFilterExpressions[qbtypes.LogAggregation](condition.CompositeQuery.Queries, names, signal, labels)
		case telemetrytypes.SignalTraces:
			expressions = prepareFilterExpressions[qbtypes.TraceAggregation](condition.CompositeQuery.Queries, names, signal, labels)
		}
	}

	switch {
	case len(expressions) == 0:
		// a ClickHouse SQL alert has no builder query; its link filters on the labels alone
		return PrepareFilterExpression(labels, "", nil), false, nil
	case len(expressions) == 1:
		return expressions[0], true, nil
	case slices.Contains(expressions, ""):
		// an unfiltered formula input matches everything, so the merged filter does too
		return "", true, nil
	}
	// the explorer list views render one query only, so a formula's inputs merge into one filter
	return "(" + strings.Join(expressions, ") OR (") + ")", true, nil
}

func resolveSelectedQueryNames(condition *ruletypes.RuleCondition) ([]string, error) {
	selected := condition.SelectedQueryName()
	for _, query := range condition.CompositeQuery.Queries {
		if query.GetQueryName() != selected {
			continue
		}
		if formula, ok := query.Spec.(qbtypes.QueryBuilderFormula); ok {
			return formula.ExtractReferencedQueryNames()
		}
		return []string{selected}, nil
	}
	return nil, nil
}

func prepareFilterExpressions[T any](queries []qbtypes.QueryEnvelope, names []string, signal telemetrytypes.Signal, labels map[string]string) []string {
	var expressions []string
	for _, query := range queries {
		if query.Type != qbtypes.QueryTypeBuilder && query.Type != qbtypes.QueryTypeBuilderAI {
			continue
		}
		spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[T])
		// spec.Disabled is deliberately not checked: a formula's inputs are
		// usually hidden in the UI but must still make it into the link
		if !ok || spec.Signal != signal || !slices.Contains(names, spec.Name) {
			continue
		}
		filterExpr := ""
		if spec.Filter != nil {
			filterExpr = spec.Filter.Expression
		}
		expressions = append(expressions, PrepareFilterExpression(labels, filterExpr, spec.GroupBy))
	}
	return expressions
}
