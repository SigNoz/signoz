package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/units"
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
	prometheus prometheus.Prometheus,
	opts ...RuleOption,
) (*PromRule, error) {
	opts = append(opts, WithLogger(logger))

	baseRule, err := NewBaseRule(id, orgID, postableRule, opts...)
	if err != nil {
		return nil, err
	}

	p := PromRule{
		BaseRule:   baseRule,
		version:    postableRule.Version,
		prometheus: prometheus,
	}
	p.logger = logger

	query, err := p.getPqlQuery(context.Background())
	if err != nil {
		// can not generate a valid prom QL query
		return nil, err
	}
	logger.Info("creating new prom rule", slog.String("rule.id", id), slog.String("rule.query", query))
	return &p, nil
}

func (r *PromRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeProm
}

func (r *PromRule) getPqlQuery(ctx context.Context) (string, error) {
	selectedQuery := r.SelectedQuery(ctx)
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
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql rule setup")
}

func (r *PromRule) matrixToCommonSeries(res promql.Matrix) []*qbtypes.TimeSeries {
	seriesSlice := make([]*qbtypes.TimeSeries, 0, len(res))
	for _, series := range res {
		commonSeries := toCommonSeries(series)
		seriesSlice = append(seriesSlice, commonSeries)
	}
	return seriesSlice
}

func (r *PromRule) buildAndRunQuery(ctx context.Context, ts time.Time) (ruletypes.Vector, error) {
	start, end := r.Timestamps(ts)
	interval := 60 * time.Second // TODO(srikanthccv): this should be configurable

	q, err := r.getPqlQuery(ctx)
	if err != nil {
		return nil, err
	}
	r.logger.InfoContext(ctx, "evaluating promql query", slog.String("rule.id", r.ID()), slog.String("rule.query", q))
	res, err := r.RunAlertQuery(ctx, q, start, end, interval)
	if err != nil {
		r.SetHealth(ruletypes.HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	matrixToProcess := r.matrixToCommonSeries(res)

	hasData := len(matrixToProcess) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	// Filter out new series if newGroupEvalDelay is configured
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, matrixToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "error filtering new series", slog.String("rule.id", r.ID()), errors.Attr(filterErr))
		} else {
			matrixToProcess = filteredSeries
		}
	}

	var resultVector ruletypes.Vector

	for _, series := range matrixToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(
				ctx, "not enough data points to evaluate series, skipping",
				"rule.id", r.ID(), "num_points", len(series.Values), "required_points", r.Condition().RequiredNumPoints,
			)
			continue
		}
		resultSeries, err := r.Threshold.Eval(series, r.Unit(), ruletypes.EvalData{
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
	prevState := r.State()
	valueFormatter := units.FormatterFromUnit(r.Unit())

	// prepare query, run query get data and filter the data based on the threshold
	results, err := r.buildAndRunQuery(ctx, ts)
	if err != nil {
		return 0, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}

	alerts := make(map[uint64]*ruletypes.Alert, len(results))

	ruleReceivers := r.Threshold.GetRuleReceivers()
	ruleReceiverMap := make(map[string][]string)
	for _, value := range ruleReceivers {
		ruleReceiverMap[value.Name] = value.Channels
	}

	for _, result := range results {
		l := make(map[string]string, len(result.Metric))
		for _, lbl := range result.Metric {
			l[lbl.Name] = lbl.Value
		}
		r.logger.DebugContext(ctx, "alerting for series", slog.String("rule.id", r.ID()), slog.Any("series", result))

		threshold := valueFormatter.Format(result.Target, result.TargetUnit)

		tmplData := ruletypes.AlertTemplateData(l, valueFormatter.Format(result.V, r.Unit()), threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		expand := func(text string) string {
			tmpl := ruletypes.NewTemplateExpander(
				ctx,
				defs+text,
				"__alert_"+r.Name(),
				tmplData,
				nil,
			)
			result, err := tmpl.Expand()
			if err != nil {
				result = fmt.Sprintf("<error expanding template: %s>", err)
				r.logger.WarnContext(ctx, "expanding alert template failed", slog.String("rule.id", r.ID()), errors.Attr(err), slog.Any("alert.template_data", tmplData))
			}
			return result
		}

		lb := ruletypes.NewBuilder(result.Metric...).Del(ruletypes.MetricNameLabel)
		resultLabels := ruletypes.NewBuilder(result.Metric...).Del(ruletypes.MetricNameLabel).Labels()

		for name, value := range r.labels.Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(ruletypes.AlertNameLabel, r.Name())
		lb.Set(ruletypes.AlertRuleIDLabel, r.ID())
		lb.Set(ruletypes.RuleSourceLabel, r.GeneratorURL())

		annotations := make(ruletypes.Labels, 0, len(r.annotations.Map()))
		for name, value := range r.annotations.Map() {
			annotations = append(annotations, ruletypes.Label{Name: name, Value: expand(value)})
		}
		if result.IsMissing {
			lb.Set(ruletypes.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(ruletypes.NoDataLabel, "true")
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			err = errors.NewInternalf(errors.CodeInternal, "vector contains metrics with the same labelset after applying alert labels")
			// We have already acquired the lock above hence using SetHealth and
			// SetLastError will deadlock.
			r.health = ruletypes.HealthBad
			r.lastError = err
			return 0, err
		}
		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLabels: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             ruletypes.StatePending,
			Value:             result.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         ruleReceiverMap[lbs.Map()[ruletypes.LabelThresholdName]],
			Missing:           result.IsMissing,
			IsRecovering:      result.IsRecovering,
		}
	}

	r.logger.InfoContext(ctx, "number of alerts found", slog.String("rule.id", r.ID()), slog.Int("alert.count", len(alerts)))
	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != ruletypes.StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			// Update the recovering and missing state of existing alert
			alert.IsRecovering = a.IsRecovering
			alert.Missing = a.Missing
			if v, ok := alert.Labels.Map()[ruletypes.LabelThresholdName]; ok {
				alert.Receivers = ruleReceiverMap[v]
			}
			continue
		}

		r.Active[h] = a

	}

	itemsToAdd := []rulestatehistorytypes.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.Active {
		labelsJSON, err := json.Marshal(a.QueryResultLabels)
		if err != nil {
			r.logger.ErrorContext(ctx, "error marshaling labels", slog.String("rule.id", r.ID()), errors.Attr(err))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == ruletypes.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ruletypes.ResolvedRetention) {
				delete(r.Active, fp)
			}
			if a.State != ruletypes.StateInactive {
				a.State = ruletypes.StateInactive
				a.ResolvedAt = ts
				itemsToAdd = append(itemsToAdd, rulestatehistorytypes.RuleStateHistory{
					RuleID:       r.ID(),
					RuleName:     r.Name(),
					State:        ruletypes.StateInactive,
					StateChanged: true,
					UnixMilli:    ts.UnixMilli(),
					Labels:       rulestatehistorytypes.LabelsString(labelsJSON),
					Fingerprint:  a.QueryResultLabels.Hash(),
				})
			}
			continue
		}

		if a.State == ruletypes.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration.Duration() {
			a.State = ruletypes.StateFiring
			a.FiredAt = ts
			state := ruletypes.StateFiring
			if a.Missing {
				state = ruletypes.StateNoData
			}
			itemsToAdd = append(itemsToAdd, rulestatehistorytypes.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       rulestatehistorytypes.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLabels.Hash(),
				Value:        a.Value,
			})
		}

		// We need to change firing alert to recovering if the returned sample meets recovery threshold
		changeAlertingToRecovering := a.State == ruletypes.StateFiring && a.IsRecovering
		// We need to change recovering alerts to firing if the returned sample meets target threshold
		changeRecoveringToFiring := a.State == ruletypes.StateRecovering && !a.IsRecovering && !a.Missing
		// in any of the above case we need to update the status of alert
		if changeAlertingToRecovering || changeRecoveringToFiring {
			state := ruletypes.StateRecovering
			if changeRecoveringToFiring {
				state = ruletypes.StateFiring
			}
			a.State = state
			r.logger.DebugContext(ctx, "converting alert state", slog.String("rule.id", r.ID()), slog.Any("alert.state", state))
			itemsToAdd = append(itemsToAdd, rulestatehistorytypes.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       rulestatehistorytypes.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLabels.Hash(),
				Value:        a.Value,
			})
		}
	}
	r.health = ruletypes.HealthGood
	r.lastError = err

	currentState := r.State()

	overallStateChanged := currentState != prevState
	for idx, item := range itemsToAdd {
		item.OverallStateChanged = overallStateChanged
		item.OverallState = currentState
		itemsToAdd[idx] = item
	}

	r.RecordRuleStateHistory(ctx, prevState, currentState, itemsToAdd)

	return len(r.Active), nil
}

func (r *PromRule) String() string {
	ar := ruletypes.PostableRule{
		AlertName:         r.name,
		RuleCondition:     r.ruleCondition,
		EvalWindow:        r.evalWindow,
		Labels:            r.labels.Map(),
		Annotations:       r.annotations.Map(),
		PreferredChannels: r.preferredChannels,
	}

	byt, err := json.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
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
		return nil, errors.NewInternalf(errors.CodeInternal, "rule result is not a vector or scalar")
	}
}

func toCommonSeries(series promql.Series) *qbtypes.TimeSeries {
	commonSeries := &qbtypes.TimeSeries{
		Labels: make([]*qbtypes.Label, 0),
		Values: make([]*qbtypes.TimeSeriesValue, 0),
	}

	series.Metric.Range(func(lbl labels.Label) {
		commonSeries.Labels = append(commonSeries.Labels, &qbtypes.Label{
			Key:   telemetrytypes.TelemetryFieldKey{Name: lbl.Name},
			Value: lbl.Value,
		})
	})

	for _, f := range series.Floats {
		commonSeries.Values = append(commonSeries.Values, &qbtypes.TimeSeriesValue{
			Timestamp: f.T,
			Value:     f.F,
		})
	}

	return commonSeries
}
