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
	"github.com/prometheus/prometheus/promql/parser"
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

// removeAllVarMatchers removes label matchers from a PromQL query that reference variables with __all__ value.
// This method parses the query, walks the AST to remove matching matchers, and returns the modified query string.
// If parsing or walking fails, it returns an error.
func (q *promqlQuery) removeAllVarMatchers(query string, vars map[string]qbv5.VariableItem) (string, error) {
	// Find all variables that have __all__ value
	allVars := make(map[string]bool)
	for k, v := range vars {
		if v.Type == qbv5.DynamicVariableType {
			if allVal, ok := v.Value.(string); ok && allVal == "__all__" {
				allVars[k] = true
			}
		}
	}

	// If no variables have __all__ value, return the query unchanged
	if len(allVars) == 0 {
		return query, nil
	}

	expr, err := parser.ParseExpr(query)
	if err != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query %q", query)
	}

	// Create visitor and walk the AST
	visitor := &allVarRemover{allVars: allVars}
	if err := parser.Walk(visitor, expr, nil); err != nil {
		q.logger.ErrorContext(context.TODO(), "unexpected error while removing __all__ variable matchers", "error", err, "query", query)
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while removing __all__ variable matchers")
	}

	// Convert the modified AST back to a string
	return expr.String(), nil
}

// TODO(srikanthccv): cleanup the templating logic
func (q *promqlQuery) renderVars(query string, vars map[string]qbv5.VariableItem, start, end uint64) (string, error) {
	// First, remove label matchers that use variables with __all__ value.
	// This must happen before variable substitution so we can detect variable references
	// in their original form ($var, {{var}}, [[var]]).
	query, err := q.removeAllVarMatchers(query, vars)
	if err != nil {
		return "", err
	}
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
	tmpl, err = tmpl.Parse(query)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	var newQuery bytes.Buffer

	// replace go template variables
	err = tmpl.Execute(&newQuery, varsData)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
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
