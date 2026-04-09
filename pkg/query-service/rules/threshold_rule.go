package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/units"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type ThresholdRule struct {
	*BaseRule

	querier querier.Querier
}

var _ Rule = (*ThresholdRule)(nil)

func NewThresholdRule(
	id string,
	orgID valuer.UUID,
	p *ruletypes.PostableRule,
	querier querier.Querier,
	logger *slog.Logger,
	opts ...RuleOption,
) (*ThresholdRule, error) {
	logger.Info("creating new ThresholdRule", slog.String("rule.id", id))

	opts = append(opts, WithLogger(logger))

	baseRule, err := NewBaseRule(id, orgID, p, opts...)
	if err != nil {
		return nil, err
	}

	return &ThresholdRule{
		BaseRule: baseRule,
		querier:  querier,
	}, nil
}

func (r *ThresholdRule) hostFromSource() string {
	parsedURL, err := url.Parse(r.source)
	if err != nil {
		return ""
	}
	if parsedURL.Port() != "" {
		return fmt.Sprintf("%s://%s:%s", parsedURL.Scheme, parsedURL.Hostname(), parsedURL.Port())
	}
	return fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Hostname())
}

func (r *ThresholdRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeThreshold
}

func (r *ThresholdRule) prepareQueryRange(ctx context.Context, ts time.Time) (*qbtypes.QueryRangeRequest, error) {
	r.logger.InfoContext(
		ctx, "prepare query range request v5",
		slog.Int64("ts", ts.UnixMilli()),
		slog.Int64("eval_window", r.evalWindow.Milliseconds()),
		slog.Int64("eval_delay", r.evalDelay.Milliseconds()),
	)

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

func (r *ThresholdRule) prepareLinksToLogs(ctx context.Context, ts time.Time, lbls ruletypes.Labels) string {
	selectedQuery := r.SelectedQuery(ctx)

	qr, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return ""
	}
	start := time.UnixMilli(int64(qr.Start))
	end := time.UnixMilli(int64(qr.End))

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	var q qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]

	for _, query := range r.ruleCondition.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeBuilder {
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				q = spec
			}
		}
	}

	if q.Signal != telemetrytypes.SignalLogs {
		return ""
	}

	filterExpr := ""
	if q.Filter != nil && q.Filter.Expression != "" {
		filterExpr = q.Filter.Expression
	}

	whereClause := contextlinks.PrepareFilterExpression(lbls.Map(), filterExpr, q.GroupBy)

	return contextlinks.PrepareLinksToLogsV5(start, end, whereClause)
}

func (r *ThresholdRule) prepareLinksToTraces(ctx context.Context, ts time.Time, lbls ruletypes.Labels) string {
	selectedQuery := r.SelectedQuery(ctx)

	qr, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return ""
	}
	start := time.UnixMilli(int64(qr.Start))
	end := time.UnixMilli(int64(qr.End))

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	var q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]

	for _, query := range r.ruleCondition.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeBuilder {
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				q = spec
			}
		}
	}

	if q.Signal != telemetrytypes.SignalTraces {
		return ""
	}

	filterExpr := ""
	if q.Filter != nil && q.Filter.Expression != "" {
		filterExpr = q.Filter.Expression
	}

	whereClause := contextlinks.PrepareFilterExpression(lbls.Map(), filterExpr, q.GroupBy)

	return contextlinks.PrepareLinksToTracesV5(start, end, whereClause)
}

func (r *ThresholdRule) buildAndRunQuery(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {
	params, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return nil, err
	}

	var results []*qbtypes.TimeSeriesData

	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "rules",
		instrumentationtypes.CodeFunctionName: "buildAndRunQuery",
	})

	v5Result, err := r.querier.QueryRange(ctx, orgID, params)
	if err != nil {
		return nil, err
	}

	for _, item := range v5Result.Data.Results {
		if tsData, ok := item.(*qbtypes.TimeSeriesData); ok {
			results = append(results, tsData)
		} else {
			// NOTE: should not happen but just to ensure we don't miss it if it happens for some reason
			r.logger.WarnContext(ctx, "expected qbtypes.TimeSeriesData but got unexpected type", slog.String("item.type", reflect.TypeOf(item).String()))
		}
	}

	selectedQuery := r.SelectedQuery(ctx)

	var queryResult *qbtypes.TimeSeriesData
	for _, res := range results {
		if res.QueryName == selectedQuery {
			queryResult = res
			break
		}
	}

	hasData := queryResult != nil &&
		len(queryResult.Aggregations) > 0 &&
		queryResult.Aggregations[0] != nil &&
		len(queryResult.Aggregations[0].Series) > 0

	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	if queryResult == nil || len(queryResult.Aggregations) == 0 || queryResult.Aggregations[0] == nil {
		r.logger.WarnContext(ctx, "query result is nil", slog.String("query.name", selectedQuery))
		return resultVector, nil
	}

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := queryResult.Aggregations[0].Series
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, seriesToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "error filtering new series", errors.Attr(filterErr))
		} else {
			seriesToProcess = filteredSeries
		}
	}

	for _, series := range seriesToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(
				ctx, "not enough data points to evaluate series, skipping",
				slog.Int("series.num_points", len(series.Values)),
				slog.Int("series.required_points", r.Condition().RequiredNumPoints),
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

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time) (int, error) {
	prevState := r.State()

	valueFormatter := units.FormatterFromUnit(r.Unit())

	var res ruletypes.Vector
	var err error

	res, err = r.buildAndRunQuery(ctx, r.orgID, ts)

	if err != nil {
		return 0, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	alerts := make(map[uint64]*ruletypes.Alert, len(res))

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
		// todo(aniket): handle different threshold
		threshold := valueFormatter.Format(smpl.Target, smpl.TargetUnit)
		r.logger.DebugContext(
			ctx, "alert template data for rule", slog.String("formatter.name", valueFormatter.Name()),
			slog.String("alert.value", value), slog.String("alert.threshold", threshold),
		)

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
				r.logger.ErrorContext(ctx, "expanding alert template failed", errors.Attr(err), slog.Any("alert.template_data", tmplData))
			}
			return result
		}

		lb := ruletypes.NewBuilder(smpl.Metric...).Del(ruletypes.MetricNameLabel).Del(ruletypes.TemporalityLabel)
		resultLabels := ruletypes.NewBuilder(smpl.Metric...).Del(ruletypes.MetricNameLabel).Del(ruletypes.TemporalityLabel).Labels()

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
		if smpl.IsMissing {
			lb.Set(ruletypes.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(ruletypes.NoDataLabel, "true")
		}

		// Links with timestamps should go in annotations since labels
		// is used alert grouping, and we want to group alerts with the same
		// label set, but different timestamps, together.
		switch r.typ {
		case ruletypes.AlertTypeTraces:
			link := r.prepareLinksToTraces(ctx, ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				r.logger.InfoContext(ctx, "adding traces link to annotations", slog.String("annotation.link", fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)))
				annotations = append(annotations, ruletypes.Label{Name: "related_traces", Value: fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)})
			}
		case ruletypes.AlertTypeLogs:
			link := r.prepareLinksToLogs(ctx, ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				r.logger.InfoContext(ctx, "adding logs link to annotations", slog.String("annotation.link", fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)))
				annotations = append(annotations, ruletypes.Label{Name: "related_logs", Value: fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)})
			}
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			return 0, errors.NewInternalf(errors.CodeInternal, "duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
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

	r.logger.InfoContext(ctx, "number of alerts found", slog.Int("alert.count", len(alerts)))

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
			r.logger.ErrorContext(ctx, "error marshaling labels", errors.Attr(err), slog.Any("alert.labels", a.Labels))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == ruletypes.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ruletypes.ResolvedRetention) {
				delete(r.Active, fp)
			}
			if a.State != ruletypes.StateInactive {
				r.logger.DebugContext(ctx, "converting firing alert to inactive")
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

		if a.State == ruletypes.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration.Duration() {
			r.logger.DebugContext(ctx, "converting pending alert to firing")
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
			r.logger.DebugContext(ctx, "converting alert state", slog.Any("alert.state", state))
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

	_ = r.RecordRuleStateHistory(ctx, itemsToAdd)

	r.health = ruletypes.HealthGood
	r.lastError = err

	return len(r.Active), nil
}

func (r *ThresholdRule) String() string {
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
