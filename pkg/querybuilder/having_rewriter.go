package querybuilder

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type HavingExpressionRewriter struct {
	columnMap map[string]string
}

// NewHavingExpressionRewriter creates a new having expression rewriter
func NewHavingExpressionRewriter() *HavingExpressionRewriter {
	return &HavingExpressionRewriter{
		columnMap: make(map[string]string),
	}
}

func (r *HavingExpressionRewriter) RewriteForTraces(expression string, aggregations []qbtypes.TraceAggregation) (string, error) {
	r.buildTraceColumnMap(aggregations)
	expression = r.rewriteExpression(expression)
	return expression, r.validateExpression(expression)
}

func (r *HavingExpressionRewriter) RewriteForLogs(expression string, aggregations []qbtypes.LogAggregation) (string, error) {
	r.buildLogColumnMap(aggregations)
	expression = r.rewriteExpression(expression)
	return expression, r.validateExpression(expression)
}

func (r *HavingExpressionRewriter) RewriteForMetrics(expression string, aggregations []qbtypes.MetricAggregation) (string, error) {
	r.buildMetricColumnMap(aggregations)
	expression = r.rewriteExpression(expression)
	return expression, r.validateExpression(expression)
}

func (r *HavingExpressionRewriter) buildTraceColumnMap(aggregations []qbtypes.TraceAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		r.columnMap[agg.Expression] = sqlColumn

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

func (r *HavingExpressionRewriter) rewriteExpression(expression string) string {
	quotedStrings := make(map[string]string)
	quotePattern := regexp.MustCompile(`'[^']*'|"[^"]*"`)
	quotedIdx := 0

	expression = quotePattern.ReplaceAllStringFunc(expression, func(match string) string {
		placeholder := fmt.Sprintf("__QUOTED_%d__", quotedIdx)
		quotedStrings[placeholder] = match
		quotedIdx++
		return placeholder
	})

	type mapping struct {
		from string
		to   string
	}

	mappings := make([]mapping, 0, len(r.columnMap))
	for from, to := range r.columnMap {
		mappings = append(mappings, mapping{from: from, to: to})
	}

	for i := 0; i < len(mappings); i++ {
		for j := i + 1; j < len(mappings); j++ {
			if len(mappings[j].from) > len(mappings[i].from) {
				mappings[i], mappings[j] = mappings[j], mappings[i]
			}
		}
	}

	for _, m := range mappings {
		if strings.Contains(m.from, "(") {
			// escape special regex characters in the function name
			escapedFrom := regexp.QuoteMeta(m.from)
			pattern := regexp.MustCompile(`\b` + escapedFrom)
			expression = pattern.ReplaceAllString(expression, m.to)
		} else {
			pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(m.from) + `\b`)
			expression = pattern.ReplaceAllString(expression, m.to)
		}
	}

	for placeholder, original := range quotedStrings {
		expression = strings.Replace(expression, placeholder, original, 1)
	}

	return expression
}

// validateExpression checks that every identifier-like token in the rewritten
// expression is a known SQL column (a value from columnMap) or a boolean keyword.
// It is always called after rewriteExpression, so all valid references have
// already been replaced with their SQL column names (e.g. __result_0, value).
func (r *HavingExpressionRewriter) validateExpression(expression string) error {

	// Build the set of valid SQL column names (the 'to' side of columnMap).
	validColumns := make(map[string]bool, len(r.columnMap))
	for _, col := range r.columnMap {
		validColumns[col] = true
	}

	// Reject quoted string literals — HAVING expressions compare aggregate
	// results which are always numeric; string values make no semantic sense.
	quotePattern := regexp.MustCompile(`'[^']*'|"[^"]*"`)
	if quotePattern.MatchString(expression) {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"HAVING expression cannot contain string literals; aggregate results are numeric",
		)
	}
	cleaned := expression

	boolKeywords := map[string]bool{"AND": true, "OR": true, "NOT": true}

	identPattern := regexp.MustCompile(`\b([a-zA-Z_][a-zA-Z0-9_]*)\b`)
	var invalid []string
	seen := map[string]bool{}
	for _, m := range identPattern.FindAllString(cleaned, -1) {
		if boolKeywords[strings.ToUpper(m)] || validColumns[m] {
			continue
		}
		if !seen[m] {
			invalid = append(invalid, m)
			seen[m] = true
		}
	}

	if len(invalid) > 0 {
		validKeys := make([]string, 0, len(r.columnMap))
		for k := range r.columnMap {
			validKeys = append(validKeys, k)
		}
		sort.Strings(validKeys)
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid references in HAVING expression: [%s]. Valid references are: [%s]",
			strings.Join(invalid, ", "),
			strings.Join(validKeys, ", "),
		)
	}

	return nil
}
