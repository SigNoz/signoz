package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/units"

	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"

	"github.com/SigNoz/signoz/ee/anomaly"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type AnomalyRule struct {
	*baserules.BaseRule

	mtx sync.Mutex

	// querier is used for alerts migrated after the introduction of new query builder
	querier querier.Querier

	provider anomaly.Provider

	version string
	logger  *slog.Logger

	seasonality anomaly.Seasonality
}

var _ baserules.Rule = (*AnomalyRule)(nil)

func NewAnomalyRule(
	id string,
	orgID valuer.UUID,
	p *ruletypes.PostableRule,
	querier querier.Querier,
	logger *slog.Logger,
	opts ...baserules.RuleOption,
) (*AnomalyRule, error) {

	logger.Info("creating new AnomalyRule", slog.String("rule.id", id))

	opts = append(opts, baserules.WithLogger(logger))

	baseRule, err := baserules.NewBaseRule(id, orgID, p, opts...)
	if err != nil {
		return nil, err
	}

	t := AnomalyRule{
		BaseRule: baseRule,
	}

	switch p.RuleCondition.Seasonality {
	case ruletypes.SeasonalityHourly:
		t.seasonality = anomaly.SeasonalityHourly
	case ruletypes.SeasonalityDaily:
		t.seasonality = anomaly.SeasonalityDaily
	case ruletypes.SeasonalityWeekly:
		t.seasonality = anomaly.SeasonalityWeekly
	default:
		t.seasonality = anomaly.SeasonalityDaily
	}

	logger.Info("using seasonality", slog.String("rule.id", id), slog.String("rule.seasonality", t.seasonality.StringValue()))

	if t.seasonality == anomaly.SeasonalityHourly {
		t.provider = anomaly.NewHourlyProvider(
			anomaly.WithQuerier[*anomaly.HourlyProvider](querier),
			anomaly.WithLogger[*anomaly.HourlyProvider](logger),
		)
	} else if t.seasonality == anomaly.SeasonalityDaily {
		t.provider = anomaly.NewDailyProvider(
			anomaly.WithQuerier[*anomaly.DailyProvider](querier),
			anomaly.WithLogger[*anomaly.DailyProvider](logger),
		)
	} else if t.seasonality == anomaly.SeasonalityWeekly {
		t.provider = anomaly.NewWeeklyProvider(
			anomaly.WithQuerier[*anomaly.WeeklyProvider](querier),
			anomaly.WithLogger[*anomaly.WeeklyProvider](logger),
		)
	}

	t.querier = querier
	t.version = p.Version
	t.logger = logger
	return &t, nil
}

func (r *AnomalyRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeAnomaly
}

func (r *AnomalyRule) prepareQueryRange(ctx context.Context, ts time.Time) *qbtypes.QueryRangeRequest {

	r.logger.InfoContext(ctx, "prepare query range request", slog.String("rule.id", r.ID()), slog.Int64("ts", ts.UnixMilli()), slog.Int64("eval.window_ms", r.EvalWindow().Milliseconds()), slog.Int64("eval.delay_ms", r.EvalDelay().Milliseconds()))

	startTs, endTs := r.Timestamps(ts)
	start, end := startTs.UnixMilli(), endTs.UnixMilli()

	req := &qbtypes.QueryRangeRequest{
		Start:       uint64(start),
		End:         uint64(end),
		RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: make([]qbtypes.QueryEnvelope, 0),
		},
		NoCache: true,
	}
	req.CompositeQuery.Queries = make([]qbtypes.QueryEnvelope, len(r.Condition().CompositeQuery.Queries))
	copy(req.CompositeQuery.Queries, r.Condition().CompositeQuery.Queries)
	return req
}

func (r *AnomalyRule) buildAndRunQuery(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {

	params := r.prepareQueryRange(ctx, ts)

	anomalies, err := r.provider.GetAnomalies(ctx, orgID, &anomaly.AnomaliesRequest{
		Params:      params,
		Seasonality: r.seasonality,
	})
	if err != nil {
		return nil, err
	}

	var queryResult *qbtypes.TimeSeriesData
	for _, result := range anomalies.Results {
		if result.QueryName == r.SelectedQuery(ctx) {
			queryResult = result
			break
		}
	}

	if queryResult == nil {
		r.logger.WarnContext(ctx, "nil qb result", slog.String("rule.id", r.ID()), slog.Int64("ts", ts.UnixMilli()))
		return ruletypes.Vector{}, nil
	}

	hasData := len(queryResult.Aggregations) > 0 &&
		queryResult.Aggregations[0] != nil &&
		len(queryResult.Aggregations[0].AnomalyScores) > 0

	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	} else if !hasData {
		r.logger.WarnContext(ctx, "no anomaly result", slog.String("rule.id", r.ID()))
		return ruletypes.Vector{}, nil
	}

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(queryResult.Aggregations[0].AnomalyScores)
	// TODO(srikanthccv): this could be noisy but we do this to answer false alert requests
	r.logger.InfoContext(ctx, "anomaly scores", slog.String("rule.id", r.ID()), slog.String("anomaly.scores", string(scoresJSON)))

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := queryResult.Aggregations[0].AnomalyScores
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, seriesToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "error filtering new series", slog.String("rule.id", r.ID()), errors.Attr(filterErr))
		} else {
			seriesToProcess = filteredSeries
		}
	}

	for _, series := range seriesToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", slog.String("rule.id", r.ID()), slog.Int("series.num_points", len(series.Values)), slog.Int("series.required_points", r.Condition().RequiredNumPoints))
			continue
		}
		results, err := r.Threshold.Eval(series, r.Unit(), ruletypes.EvalData{
			ActiveAlerts:  r.ActiveAlertsLabelFP(),
			SendUnmatched: r.ShouldSendUnmatched(),
		})
		if err != nil {
			return nil, err
		}
		resultVector = append(resultVector, results...)
	}
	return resultVector, nil
}

func (r *AnomalyRule) Eval(ctx context.Context, ts time.Time) (int, error) {

	prevState := r.State()

	valueFormatter := units.FormatterFromUnit(r.Unit())

	var res ruletypes.Vector
	var err error

	r.logger.InfoContext(ctx, "running query", slog.String("rule.id", r.ID()))
	res, err = r.buildAndRunQuery(ctx, r.OrgID(), ts)

	if err != nil {
		return 0, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var alerts = make(map[uint64]*ruletypes.Alert, len(res))

	ruleReceivers := r.Threshold.GetRuleReceivers()
	ruleReceiverMap := make(map[string][]string)
	for _, value := range ruleReceivers {
		ruleReceiverMap[value.Name] = value.Channels
	}

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}
		value := valueFormatter.Format(smpl.V, r.Unit())
		threshold := valueFormatter.Format(smpl.Target, smpl.TargetUnit)
		r.logger.DebugContext(ctx, "alert template data for rule", slog.String("rule.id", r.ID()), slog.String("formatter.name", valueFormatter.Name()), slog.String("alert.value", value), slog.String("alert.threshold", threshold))

		tmplData := ruletypes.AlertTemplateData(l, value, threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		// utility function to apply go template on labels and annotations
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
				r.logger.ErrorContext(ctx, "expanding alert template failed", slog.String("rule.id", r.ID()), errors.Attr(err), slog.Any("alert.template_data", tmplData))
			}
			return result
		}

		lb := ruletypes.NewBuilder(smpl.Metric...).Del(ruletypes.MetricNameLabel).Del(ruletypes.TemporalityLabel)
		resultLabels := ruletypes.NewBuilder(smpl.Metric...).Del(ruletypes.MetricNameLabel).Del(ruletypes.TemporalityLabel).Labels()

		for name, value := range r.Labels().Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(ruletypes.AlertNameLabel, r.Name())
		lb.Set(ruletypes.AlertRuleIDLabel, r.ID())
		lb.Set(ruletypes.RuleSourceLabel, r.GeneratorURL())

		annotations := make(ruletypes.Labels, 0, len(r.Annotations().Map()))
		for name, value := range r.Annotations().Map() {
			annotations = append(annotations, ruletypes.Label{Name: name, Value: expand(value)})
		}
		if smpl.IsMissing {
			lb.Set(ruletypes.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(ruletypes.NoDataLabel, "true")
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			r.logger.ErrorContext(ctx, "the alert query returns duplicate records", slog.String("rule.id", r.ID()), slog.Any("alert", alerts[h]))
			err = errors.NewInternalf(errors.CodeInternal, "duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			return 0, err
		}

		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLabels: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             ruletypes.StatePending,
			Value:             smpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         ruleReceiverMap[lbs.Map()[ruletypes.LabelThresholdName]],
			Missing:           smpl.IsMissing,
			IsRecovering:      smpl.IsRecovering,
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
			r.logger.ErrorContext(ctx, "error marshaling labels", slog.String("rule.id", r.ID()), errors.Attr(err), slog.Any("alert.labels", a.Labels))
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
					Value:        a.Value,
				})
			}
			continue
		}

		if a.State == ruletypes.StatePending && ts.Sub(a.ActiveAt) >= r.HoldDuration().Duration() {
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
		changeFiringToRecovering := a.State == ruletypes.StateFiring && a.IsRecovering
		// We need to change recovering alerts to firing if the returned sample meets target threshold
		changeRecoveringToFiring := a.State == ruletypes.StateRecovering && !a.IsRecovering && !a.Missing
		// in any of the above case we need to update the status of alert
		if changeFiringToRecovering || changeRecoveringToFiring {
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

func (r *AnomalyRule) String() string {

	ar := ruletypes.PostableRule{
		AlertName:         r.Name(),
		RuleCondition:     r.Condition(),
		EvalWindow:        r.EvalWindow(),
		Labels:            r.Labels().Map(),
		Annotations:       r.Annotations().Map(),
		PreferredChannels: r.PreferredChannels(),
	}

	byt, err := json.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}
