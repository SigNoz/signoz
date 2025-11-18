package querier

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"text/template"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/prometheus/prometheus/promql"
)

type promqlQuery struct {
	logger      *slog.Logger
	promEngine  prometheus.Prometheus
	query       qbv5.PromQuery
	tr          qbv5.TimeRange
	requestType qbv5.RequestType
	vars        map[string]qbv5.VariableItem
}

var _ qbv5.Query = (*promqlQuery)(nil)

func newPromqlQuery(
	logger *slog.Logger,
	promEngine prometheus.Prometheus,
	query qbv5.PromQuery,
	tr qbv5.TimeRange,
	requestType qbv5.RequestType,
	variables map[string]qbv5.VariableItem,
) *promqlQuery {
	return &promqlQuery{logger, promEngine, query, tr, requestType, variables}
}

func (q *promqlQuery) Fingerprint() string {
	query, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		q.logger.ErrorContext(context.TODO(), "failed render template variables", "query", q.query.Query)
		return ""
	}
	parts := []string{
		"promql",
		query,
		q.query.Step.Duration.String(),
	}

	return strings.Join(parts, "&")
}

func (q *promqlQuery) Window() (uint64, uint64) {
	return q.tr.From, q.tr.To
}

// stripAllSelectors removes label matchers from PromQL queries when the variable has __all__ value.
// This function finds all label selectors (inside {...}) and removes matchers that reference
// dynamic variables with __all__ value, similar to how other query types handle this.
func stripAllSelectors(query string, vars map[string]qbv5.VariableItem) string {
	// Find all variables that have __all__ value
	allVars := make(map[string]bool)
	for k, v := range vars {
		if v.Type == qbv5.DynamicVariableType {
			if allVal, ok := v.Value.(string); ok && allVal == "__all__" {
				allVars[k] = true
			}
		}
	}

	if len(allVars) == 0 {
		return query
	}

	// Find all label selectors { ... } and process them. PromQL does not allow nested selectors,
	// so we just look for the next closing brace that isn't inside a quoted string.
	var result strings.Builder
	i := 0
	for i < len(query) {
		if query[i] != '{' {
			result.WriteByte(query[i])
			i++
			continue
		}

		start := i
		j := i + 1
		inQuotes := false // this tells us if our current traversal is within quotes (inQuotes=true)
		for j < len(query) {
			if query[j] == '"' {
				inQuotes = !inQuotes // flip inQuotes
				j++
				continue
			}
			if !inQuotes && query[j] == '}' {
				break
			}
			j++
		}

		if j >= len(query) || query[j] != '}' {
			// No matching brace found - copy the rest and stop processing.
			result.WriteString(query[start:])
			break
		}

		selector := query[start+1 : j]
		cleanedSelector := removeMatchersWithAllVars(selector, allVars)
		if cleanedSelector != "" {
			result.WriteByte('{')
			result.WriteString(cleanedSelector)
			result.WriteByte('}')
		}

		i = j + 1
	}

	if i < len(query) {
		result.WriteString(query[i:])
	}

	return result.String()
}

// removeMatchersWithAllVars removes matchers from a label selector that reference variables with __all__ value.
func removeMatchersWithAllVars(selector string, allVars map[string]bool) string {
	// Parse matchers by splitting on commas, but respect quoted strings
	matchers := parseMatchers(selector)
	var keptMatchers []string

	for _, matcher := range matchers {
		matcher = strings.TrimSpace(matcher)
		if matcher == "" {
			continue
		}

		// Check if this matcher contains a variable reference with __all__ value
		// Variables can be: $var, {{var}}, [[var]]
		shouldRemove := false

		// Check for $var pattern
		if strings.Contains(matcher, "$") {
			for varName := range allVars {
				// Check for $varName in the matcher (can be in quotes or not)
				if strings.Contains(matcher, "$"+varName) {
					shouldRemove = true
					break
				}
			}
		}

		// Check for {{var}} pattern
		if !shouldRemove && strings.Contains(matcher, "{{") {
			for varName := range allVars {
				if strings.Contains(matcher, "{{"+varName+"}}") {
					shouldRemove = true
					break
				}
			}
		}

		// Check for [[var]] pattern
		if !shouldRemove && strings.Contains(matcher, "[[") {
			for varName := range allVars {
				if strings.Contains(matcher, "[["+varName+"]]") {
					shouldRemove = true
					break
				}
			}
		}

		if !shouldRemove {
			keptMatchers = append(keptMatchers, matcher)
		}
	}

	if len(keptMatchers) == 0 {
		return ""
	}

	return strings.Join(keptMatchers, ", ")
}

// parseMatchers splits a label selector string into individual matchers, handling quoted strings.
func parseMatchers(selector string) []string {
	var matchers []string
	var current strings.Builder
	inQuotes := false
	i := 0

	for i < len(selector) {
		char := selector[i]

		if !inQuotes {
			if char == '"' {
				inQuotes = true
				current.WriteByte(char)
				i++
			} else if char == ',' {
				// End of matcher
				matcher := strings.TrimSpace(current.String())
				if matcher != "" {
					matchers = append(matchers, matcher)
				}
				current.Reset()
				i++
				// Skip whitespace after comma
				for i < len(selector) && selector[i] == ' ' {
					i++
				}
			} else {
				current.WriteByte(char)
				i++
			}
		} else {
			// Inside quoted string - just copy until closing quote
			current.WriteByte(char)
			if char == '"' {
				inQuotes = false
			}
			i++
		}
	}

	// Add last matcher
	matcher := strings.TrimSpace(current.String())
	if matcher != "" {
		matchers = append(matchers, matcher)
	}

	return matchers
}

// TODO(srikanthccv): cleanup the templating logic
func (q *promqlQuery) renderVars(query string, vars map[string]qbv5.VariableItem, start, end uint64) (string, error) {
	// First, remove label matchers that use variables with __all__ value
	// This must happen before variable substitution
	fmt.Printf("===> query received: %s\n", query)
	query = stripAllSelectors(query, vars)
	fmt.Printf("===> query post stripping all: %s\n", query)
	varsData := map[string]any{}
	for k, v := range vars {
		varsData[k] = formatValueForProm(v.Value)
	}

	querybuilder.AssignReservedVars(varsData, start, end)

	keys := make([]string, 0, len(varsData))
	for k := range varsData {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})

	for _, k := range keys {
		query = strings.Replace(query, fmt.Sprintf("{{%s}}", k), fmt.Sprint(varsData[k]), -1)
		query = strings.Replace(query, fmt.Sprintf("[[%s]]", k), fmt.Sprint(varsData[k]), -1)
		query = strings.Replace(query, fmt.Sprintf("$%s", k), fmt.Sprint(varsData[k]), -1)
	}

	tmpl := template.New("promql-query")
	tmpl, err := tmpl.Parse(query)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	var newQuery bytes.Buffer

	// replace go template variables
	err = tmpl.Execute(&newQuery, varsData)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}

	fmt.Printf("===> newQuery: %s\n", newQuery.String())
	return newQuery.String(), nil
}

func (q *promqlQuery) Execute(ctx context.Context) (*qbv5.Result, error) {

	start := int64(querybuilder.ToNanoSecs(q.tr.From))
	end := int64(querybuilder.ToNanoSecs(q.tr.To))

	query, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		return nil, err
	}

	qry, err := q.promEngine.Engine().NewRangeQuery(
		ctx,
		q.promEngine.Storage(),
		nil,
		query,
		time.Unix(0, start),
		time.Unix(0, end),
		q.query.Step.Duration,
	)

	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query %q", query)
	}

	res := qry.Exec(ctx)
	if res.Err != nil {
		var eqc promql.ErrQueryCanceled
		var eqt promql.ErrQueryTimeout
		var es promql.ErrStorage
		switch {
		case errors.As(res.Err, &eqc):
			return nil, errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled")
		case errors.As(res.Err, &eqt):
			return nil, errors.Newf(errors.TypeTimeout, errors.CodeTimeout, "query timeout")
		case errors.As(res.Err, &es):
			return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
		}

		if errors.Is(res.Err, context.Canceled) {
			return nil, errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled")
		}

		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
	}

	defer qry.Close()

	matrix, promErr := res.Matrix()
	if promErr != nil {
		return nil, errors.WrapInternalf(promErr, errors.CodeInternal, "error getting matrix from promql query %q", query)
	}

	var series []*qbv5.TimeSeries
	for _, v := range matrix {
		var s qbv5.TimeSeries
		lbls := make([]*qbv5.Label, 0, len(v.Metric))
		for name, value := range v.Metric.Copy().Map() {
			lbls = append(lbls, &qbv5.Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: name},
				Value: value,
			})
		}

		s.Labels = lbls

		for idx := range v.Floats {
			p := v.Floats[idx]
			s.Values = append(s.Values, &qbv5.TimeSeriesValue{
				Timestamp: p.T,
				Value:     p.F,
			})
		}
		series = append(series, &s)
	}

	warnings, _ := res.Warnings.AsStrings(query, 10, 0)

	return &qbv5.Result{
		Type: q.requestType,
		Value: &qbv5.TimeSeriesData{
			QueryName: q.query.Name,
			Aggregations: []*qbv5.AggregationBucket{
				{
					Series: series,
				},
			},
		},
		Warnings: warnings,
		// TODO: map promql stats?
	}, nil
}
