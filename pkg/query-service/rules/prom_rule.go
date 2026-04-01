package rules

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	plabels "github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type PromRule struct {
	*BaseRule
	version    string
	prometheus prometheus.Prometheus
}

var _ Rule = (*PromRule)(nil)

func NewPromRule(
	id string,
	orgID valuer.UUID,
	postableRule *ruletypes.PostableRule,
	logger *slog.Logger,
	reader interfaces.Reader,
	prometheus prometheus.Prometheus,
	opts ...RuleOption,
) (*PromRule, error) {
	opts = append(opts, WithLogger(logger))

	baseRule, err := NewBaseRule(id, orgID, postableRule, reader, opts...)
	if err != nil {
		return nil, err
	}

	p := PromRule{
		BaseRule:   baseRule,
		version:    postableRule.Version,
		prometheus: prometheus,
	}
	p.logger = logger

	query, err := p.getPqlQuery()
	if err != nil {
		// can not generate a valid prom QL query
		return nil, err
	}
	logger.Info("creating new prom rule", "rule_name", p.name, "query", query)
	return &p, nil
}

func (r *PromRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeProm
}

func (r *PromRule) GetSelectedQuery() string {
	if r.ruleCondition != nil {
		// If the user has explicitly set the selected query, we return that.
		if r.ruleCondition.SelectedQuery != "" {
			return r.ruleCondition.SelectedQuery
		}
		// Historically, we used to have only one query in the alerts for promql.
		// So, if there is only one query, we return that.
		// This is to maintain backward compatibility.
		// For new rules, we will have to explicitly set the selected query.
		return "A"
	}
	// This should never happen.
	return ""
}

func (r *PromRule) getPqlQuery() (string, error) {
	if r.version == "v5" {
		if len(r.ruleCondition.CompositeQuery.Queries) > 0 {
			selectedQuery := r.GetSelectedQuery()
			for _, item := range r.ruleCondition.CompositeQuery.Queries {
				switch item.Type {
				case qbtypes.QueryTypePromQL:
					promQuery, ok := item.Spec.(qbtypes.PromQuery)
					if !ok {
						return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", item.Spec)
					}
					if promQuery.Name == selectedQuery {
						return promQuery.Query, nil
					}
				}
			}
		}
		return "", fmt.Errorf("invalid promql rule setup")
	}

	if r.ruleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
		if len(r.ruleCondition.CompositeQuery.PromQueries) > 0 {
			selectedQuery := r.GetSelectedQuery()
			if promQuery, ok := r.ruleCondition.CompositeQuery.PromQueries[selectedQuery]; ok {
				query := promQuery.Query
				if query == "" {
					return query, fmt.Errorf("a promquery needs to be set for this rule to function")
				}
				return query, nil
			}
		}
	}

	return "", fmt.Errorf("invalid promql rule query")
}

func (r *PromRule) matrixToV3Series(res promql.Matrix) []*v3.Series {
	v3Series := make([]*v3.Series, 0, len(res))
	for _, series := range res {
		commonSeries := toCommonSeries(series)
		v3Series = append(v3Series, &commonSeries)
	}
	return v3Series
}

func (r *PromRule) buildAndRunQuery(ctx context.Context, ts time.Time) (ruletypes.Vector, error) {
	start, end := r.Timestamps(ts)
	interval := 60 * time.Second // TODO(srikanthccv): this should be configurable

	q, err := r.getPqlQuery()
	if err != nil {
		return nil, err
	}
	r.logger.InfoContext(ctx, "evaluating promql query", "rule_name", r.Name(), "query", q)
	res, err := r.RunAlertQuery(ctx, q, start, end, interval)
	if err != nil {
		r.SetHealth(ruletypes.HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	matrixToProcess := r.matrixToV3Series(res)

	hasData := len(matrixToProcess) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	// Filter out new series if newGroupEvalDelay is configured
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, matrixToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "Error filtering new series, ", errors.Attr(filterErr), "rule_name", r.Name())
		} else {
			matrixToProcess = filteredSeries
		}
	}

	var resultVector ruletypes.Vector

	for _, series := range matrixToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(
				ctx, "not enough data points to evaluate series, skipping",
				"rule_id", r.ID(), "num_points", len(series.Points), "required_points", r.Condition().RequiredNumPoints,
			)
			continue
		}
		resultSeries, err := r.Threshold.Eval(*series, r.Unit(), ruletypes.EvalData{
			ActiveAlerts:  r.ActiveAlertsLabelFP(),
			SendUnmatched: r.ShouldSendUnmatched(),
		})
		if err != nil {
			return nil, err
		}
		resultVector = append(resultVector, resultSeries...)
	}
	return resultVector, nil
}

func (r *PromRule) Eval(ctx context.Context, ts time.Time) (int, error) {
	// prepare query, run query get data and filter the data based on the threshold
	res, err := r.buildAndRunQuery(ctx, ts)
	if err != nil {
		return 0, err
	}

	opts := EvalVectorOptions{
		DeleteLabels: []string{labels.MetricNameLabel},
	}
	return r.EvalVector(ctx, ts, res, opts)
}

func (r *PromRule) RunAlertQuery(ctx context.Context, qs string, start, end time.Time, interval time.Duration) (promql.Matrix, error) {
	q, err := r.prometheus.Engine().NewRangeQuery(ctx, r.prometheus.Storage(), nil, qs, start, end, interval)
	if err != nil {
		return nil, err
	}

	res := q.Exec(ctx)

	if res.Err != nil {
		return nil, res.Err
	}

	err = prometheus.RemoveExtraLabels(res, prometheus.FingerprintAsPromLabelName)
	if err != nil {
		return nil, err
	}

	switch typ := res.Value.(type) {
	case promql.Vector:
		series := make([]promql.Series, 0, len(typ))
		value := res.Value.(promql.Vector)
		for _, smpl := range value {
			series = append(series, promql.Series{
				Metric: smpl.Metric,
				Floats: []promql.FPoint{{T: smpl.T, F: smpl.F}},
			})
		}
		return series, nil
	case promql.Scalar:
		value := res.Value.(promql.Scalar)
		series := make([]promql.Series, 0, 1)
		series = append(series, promql.Series{
			Floats: []promql.FPoint{{T: value.T, F: value.V}},
		})
		return series, nil
	case promql.Matrix:
		return res.Value.(promql.Matrix), nil
	default:
		return nil, fmt.Errorf("rule result is not a vector or scalar")
	}
}

func toCommonSeries(series promql.Series) v3.Series {
	commonSeries := v3.Series{
		Labels:      make(map[string]string),
		LabelsArray: make([]map[string]string, 0),
		Points:      make([]v3.Point, 0),
	}

	series.Metric.Range(func(lbl plabels.Label) {
		commonSeries.Labels[lbl.Name] = lbl.Value
		commonSeries.LabelsArray = append(commonSeries.LabelsArray, map[string]string{
			lbl.Name: lbl.Value,
		})
	})

	for _, f := range series.Floats {
		commonSeries.Points = append(commonSeries.Points, v3.Point{
			Timestamp: f.T,
			Value:     f.F,
		})
	}

	return commonSeries
}
