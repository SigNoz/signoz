package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"

	"github.com/SigNoz/signoz/pkg/query-service/formatter"

	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"

	"github.com/SigNoz/signoz/ee/query-service/anomaly"

	anomalyV2 "github.com/SigNoz/signoz/ee/anomaly"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const (
	RuleTypeAnomaly = "anomaly_rule"
)

type AnomalyRule struct {
	*baserules.BaseRule

	mtx sync.Mutex

	reader interfaces.Reader

	// querierV5 is the query builder v5 querier used for all alert rule evaluation
	querierV5 querierV5.Querier

	providerV2 anomalyV2.Provider

	logger *slog.Logger

	seasonality anomaly.Seasonality
}

var _ baserules.Rule = (*AnomalyRule)(nil)

func NewAnomalyRule(
	id string,
	orgID valuer.UUID,
	p *ruletypes.PostableRule,
	reader interfaces.Reader,
	querierV5 querierV5.Querier,
	logger *slog.Logger,
	cache cache.Cache,
	opts ...baserules.RuleOption,
) (*AnomalyRule, error) {

	logger.Info("creating new AnomalyRule", "rule_id", id)

	opts = append(opts, baserules.WithLogger(logger))

	baseRule, err := baserules.NewBaseRule(id, orgID, p, reader, opts...)
	if err != nil {
		return nil, err
	}

	t := AnomalyRule{
		BaseRule: baseRule,
	}

	switch strings.ToLower(p.RuleCondition.Seasonality) {
	case "hourly":
		t.seasonality = anomaly.SeasonalityHourly
	case "daily":
		t.seasonality = anomaly.SeasonalityDaily
	case "weekly":
		t.seasonality = anomaly.SeasonalityWeekly
	default:
		t.seasonality = anomaly.SeasonalityDaily
	}

	logger.Info("using seasonality", "seasonality", t.seasonality.String())

	if t.seasonality == anomaly.SeasonalityHourly {
		t.providerV2 = anomalyV2.NewHourlyProvider(
			anomalyV2.WithQuerier[*anomalyV2.HourlyProvider](querierV5),
			anomalyV2.WithLogger[*anomalyV2.HourlyProvider](logger),
		)
	} else if t.seasonality == anomaly.SeasonalityDaily {
		t.providerV2 = anomalyV2.NewDailyProvider(
			anomalyV2.WithQuerier[*anomalyV2.DailyProvider](querierV5),
			anomalyV2.WithLogger[*anomalyV2.DailyProvider](logger),
		)
	} else if t.seasonality == anomaly.SeasonalityWeekly {
		t.providerV2 = anomalyV2.NewWeeklyProvider(
			anomalyV2.WithQuerier[*anomalyV2.WeeklyProvider](querierV5),
			anomalyV2.WithLogger[*anomalyV2.WeeklyProvider](logger),
		)
	}

	t.querierV5 = querierV5
	t.reader = reader
	t.logger = logger
	return &t, nil
}

func (r *AnomalyRule) Type() ruletypes.RuleType {
	return RuleTypeAnomaly
}

func (r *AnomalyRule) prepareQueryRange(ctx context.Context, ts time.Time) (*qbtypes.QueryRangeRequest, error) {

	r.logger.InfoContext(ctx, "prepare query range request", "ts", ts.UnixMilli(), "eval_window", r.EvalWindow().Milliseconds(), "eval_delay", r.EvalDelay().Milliseconds())

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
	return req, nil
}

func (r *AnomalyRule) GetSelectedQuery() string {
	return r.Condition().GetSelectedQueryName()
}

func (r *AnomalyRule) buildAndRunQuery(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {

	params, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return nil, err
	}

	anomalies, err := r.providerV2.GetAnomalies(ctx, orgID, &anomalyV2.AnomaliesRequest{
		Params:      *params,
		Seasonality: anomalyV2.Seasonality{String: valuer.NewString(r.seasonality.String())},
	})
	if err != nil {
		return nil, err
	}

	var qbResult *qbtypes.TimeSeriesData
	for _, result := range anomalies.Results {
		if result.QueryName == r.GetSelectedQuery() {
			qbResult = result
			break
		}
	}

	if qbResult == nil {
		r.logger.WarnContext(ctx, "nil qb result", "ts", ts.UnixMilli())
	}

	var anomalyScores []*qbtypes.TimeSeries
	if qbResult != nil {
		for _, bucket := range qbResult.Aggregations {
			anomalyScores = append(anomalyScores, bucket.AnomalyScores...)
		}
	}

	hasData := len(anomalyScores) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(anomalyScores)
	r.logger.InfoContext(ctx, "anomaly scores", "scores", string(scoresJSON))

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := anomalyScores
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, seriesToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "Error filtering new series, ", "error", filterErr, "rule_name", r.Name())
		} else {
			seriesToProcess = filteredSeries
		}
	}

	for _, series := range seriesToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Values), "requiredPoints", r.Condition().RequiredNumPoints)
			continue
		}
		results, err := r.Threshold.Eval(*series, r.Unit(), ruletypes.EvalData{
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

	valueFormatter := formatter.FromUnit(r.Unit())

	res, err := r.buildAndRunQuery(ctx, r.OrgID(), ts)
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
		r.logger.DebugContext(ctx, "Alert template data for rule", "rule_name", r.Name(), "formatter", valueFormatter.Name(), "value", value, "threshold", threshold)

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
				times.Time(timestamp.FromTime(ts)),
				nil,
			)
			result, err := tmpl.Expand()
			if err != nil {
				result = fmt.Sprintf("<error expanding template: %s>", err)
				r.logger.ErrorContext(ctx, "Expanding alert template failed", "error", err, "data", tmplData, "rule_name", r.Name())
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(labels.MetricNameLabel).Del(labels.TemporalityLabel)
		resultLabels := labels.NewBuilder(smpl.Metric).Del(labels.MetricNameLabel).Del(labels.TemporalityLabel).Labels()

		for name, value := range r.Labels().Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(labels.AlertNameLabel, r.Name())
		lb.Set(labels.AlertRuleIdLabel, r.ID())
		lb.Set(labels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(labels.Labels, 0, len(r.Annotations().Map()))
		for name, value := range r.Annotations().Map() {
			annotations = append(annotations, labels.Label{Name: name, Value: expand(value)})
		}
		if smpl.IsMissing {
			lb.Set(labels.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(labels.NoDataLabel, "true")
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			r.logger.ErrorContext(ctx, "the alert query returns duplicate records", "rule_id", r.ID(), "alert", alerts[h])
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			return 0, err
		}

		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLables: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             model.StatePending,
			Value:             smpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         ruleReceiverMap[lbs.Map()[ruletypes.LabelThresholdName]],
			Missing:           smpl.IsMissing,
			IsRecovering:      smpl.IsRecovering,
		}
	}

	r.logger.InfoContext(ctx, "number of alerts found", "rule_name", r.Name(), "alerts_count", len(alerts))
	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != model.StateInactive {

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

	itemsToAdd := []model.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.Active {
		labelsJSON, err := json.Marshal(a.QueryResultLables)
		if err != nil {
			r.logger.ErrorContext(ctx, "error marshaling labels", "error", err, "labels", a.Labels)
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == model.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ruletypes.ResolvedRetention) {
				delete(r.Active, fp)
			}
			if a.State != model.StateInactive {
				a.State = model.StateInactive
				a.ResolvedAt = ts
				itemsToAdd = append(itemsToAdd, model.RuleStateHistory{
					RuleID:       r.ID(),
					RuleName:     r.Name(),
					State:        model.StateInactive,
					StateChanged: true,
					UnixMilli:    ts.UnixMilli(),
					Labels:       model.LabelsString(labelsJSON),
					Fingerprint:  a.QueryResultLables.Hash(),
					Value:        a.Value,
				})
			}
			continue
		}

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.HoldDuration().Duration() {
			a.State = model.StateFiring
			a.FiredAt = ts
			state := model.StateFiring
			if a.Missing {
				state = model.StateNoData
			}
			itemsToAdd = append(itemsToAdd, model.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       model.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLables.Hash(),
				Value:        a.Value,
			})
		}

		// We need to change firing alert to recovering if the returned sample meets recovery threshold
		changeFiringToRecovering := a.State == model.StateFiring && a.IsRecovering
		// We need to change recovering alerts to firing if the returned sample meets target threshold
		changeRecoveringToFiring := a.State == model.StateRecovering && !a.IsRecovering && !a.Missing
		// in any of the above case we need to update the status of alert
		if changeFiringToRecovering || changeRecoveringToFiring {
			state := model.StateRecovering
			if changeRecoveringToFiring {
				state = model.StateFiring
			}
			a.State = state
			r.logger.DebugContext(ctx, "converting alert state", "name", r.Name(), "state", state)
			itemsToAdd = append(itemsToAdd, model.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       model.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLables.Hash(),
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
