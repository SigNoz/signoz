package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"

	"github.com/SigNoz/signoz/pkg/query-service/formatter"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type ThresholdRule struct {
	*BaseRule

	// querierV5 is the query builder v5 querier used for all alert rule evaluation
	querierV5 querierV5.Querier
}

var _ Rule = (*ThresholdRule)(nil)

func NewThresholdRule(
	id string,
	orgID valuer.UUID,
	p *ruletypes.PostableRule,
	reader interfaces.Reader,
	querierV5 querierV5.Querier,
	logger *slog.Logger,
	opts ...RuleOption,
) (*ThresholdRule, error) {
	logger.Info("creating new ThresholdRule", "id", id)

	opts = append(opts, WithLogger(logger))

	baseRule, err := NewBaseRule(id, orgID, p, reader, opts...)
	if err != nil {
		return nil, err
	}

	t := ThresholdRule{
		BaseRule:   baseRule,
		querierV5: querierV5,
	}

	t.reader = reader
	return &t, nil
}

func (r *ThresholdRule) hostFromSource() string {
	parsedUrl, err := url.Parse(r.source)
	if err != nil {
		return ""
	}
	if parsedUrl.Port() != "" {
		return fmt.Sprintf("%s://%s:%s", parsedUrl.Scheme, parsedUrl.Hostname(), parsedUrl.Port())
	}
	return fmt.Sprintf("%s://%s", parsedUrl.Scheme, parsedUrl.Hostname())
}

func (r *ThresholdRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeThreshold
}

func (r *ThresholdRule) prepareQueryRange(ctx context.Context, ts time.Time) (*qbtypes.QueryRangeRequest, error) {
	r.logger.InfoContext(
		ctx, "prepare query range request", "ts", ts.UnixMilli(), "eval_window", r.evalWindow.Milliseconds(), "eval_delay", r.evalDelay.Milliseconds(),
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

func (r *ThresholdRule) prepareLinksToLogs(ctx context.Context, ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

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

func (r *ThresholdRule) prepareLinksToTraces(ctx context.Context, ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

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

func (r *ThresholdRule) GetSelectedQuery() string {
	return r.ruleCondition.GetSelectedQueryName()
}

func (r *ThresholdRule) buildAndRunQuery(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {
	params, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return nil, err
	}

	v5Result, err := r.querierV5.QueryRange(ctx, orgID, params)
	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get alert query result", "rule_name", r.Name(), "error", err)
		return nil, fmt.Errorf("internal error while querying")
	}

	selectedQuery := r.GetSelectedQuery()

	var queryResult *qbtypes.TimeSeriesData
	for _, item := range v5Result.Data.Results {
		if tsData, ok := item.(*qbtypes.TimeSeriesData); ok && tsData.QueryName == selectedQuery {
			queryResult = tsData
			break
		}
	}

	var allSeries []*qbtypes.TimeSeries
	if queryResult != nil {
		for _, bucket := range queryResult.Aggregations {
			allSeries = append(allSeries, bucket.Series...)
		}
	}

	hasData := len(allSeries) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	if queryResult == nil {
		r.logger.WarnContext(ctx, "query result is nil", "rule_name", r.Name(), "query_name", selectedQuery)
		return resultVector, nil
	}

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := allSeries
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

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time) (int, error) {
	prevState := r.State()

	valueFormatter := formatter.FromUnit(r.Unit())

	res, err := r.buildAndRunQuery(ctx, r.orgID, ts)

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
				r.logger.ErrorContext(ctx, "Expanding alert template failed", "error", err, "data", tmplData)
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(labels.MetricNameLabel).Del(labels.TemporalityLabel)
		resultLabels := labels.NewBuilder(smpl.Metric).Del(labels.MetricNameLabel).Del(labels.TemporalityLabel).Labels()

		for name, value := range r.labels.Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(labels.AlertNameLabel, r.Name())
		lb.Set(labels.AlertRuleIdLabel, r.ID())
		lb.Set(labels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(labels.Labels, 0, len(r.annotations.Map()))
		for name, value := range r.annotations.Map() {
			annotations = append(annotations, labels.Label{Name: name, Value: expand(value)})
		}
		if smpl.IsMissing {
			lb.Set(labels.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(labels.NoDataLabel, "true")
		}

		// Links with timestamps should go in annotations since labels
		// is used alert grouping, and we want to group alerts with the same
		// label set, but different timestamps, together.
		switch r.typ {
		case ruletypes.AlertTypeTraces:
			link := r.prepareLinksToTraces(ctx, ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				r.logger.InfoContext(ctx, "adding traces link to annotations", "link", fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link))
				annotations = append(annotations, labels.Label{Name: "related_traces", Value: fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)})
			}
		case ruletypes.AlertTypeLogs:
			link := r.prepareLinksToLogs(ctx, ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				r.logger.InfoContext(ctx, "adding logs link to annotations", "link", fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link))
				annotations = append(annotations, labels.Label{Name: "related_logs", Value: fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)})
			}
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			return 0, fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
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
				r.logger.DebugContext(ctx, "converting firing alert to inActive", "name", r.Name())
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

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration.Duration() {
			r.logger.DebugContext(ctx, "converting pending alert to firing", "name", r.Name())
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
		changeAlertingToRecovering := a.State == model.StateFiring && a.IsRecovering
		// We need to change recovering alerts to firing if the returned sample meets target threshold
		changeRecoveringToFiring := a.State == model.StateRecovering && !a.IsRecovering && !a.Missing
		// in any of the above case we need to update the status of alert
		if changeAlertingToRecovering || changeRecoveringToFiring {
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
