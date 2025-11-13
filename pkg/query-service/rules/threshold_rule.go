package rules

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"reflect"
	"text/template"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/postprocess"
	"github.com/SigNoz/signoz/pkg/transition"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/app/querier"
	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	querytemplate "github.com/SigNoz/signoz/pkg/query-service/utils/queryTemplate"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"

	logsv3 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v3"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	"github.com/SigNoz/signoz/pkg/query-service/formatter"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type ThresholdRule struct {
	*BaseRule
	// Ever since we introduced the new metrics query builder, the version is "v4"
	// for all the rules
	// if the version is "v3", then we use the old querier
	// if the version is "v4", then we use the new querierV2
	version string

	// querier is used for alerts created before the introduction of new metrics query builder
	querier interfaces.Querier
	// querierV2 is used for alerts created after the introduction of new metrics query builder
	querierV2 interfaces.Querier

	// querierV5 is used for alerts migrated after the introduction of new query builder
	querierV5 querierV5.Querier

	// used for attribute metadata enrichment for logs and traces
	logsKeys  map[string]v3.AttributeKey
	spansKeys map[string]v3.AttributeKey
}

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
		BaseRule: baseRule,
		version:  p.Version,
	}

	querierOption := querier.QuerierOptions{
		Reader:       reader,
		Cache:        nil,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:       reader,
		Cache:        nil,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
	}

	t.querier = querier.NewQuerier(querierOption)
	t.querierV2 = querierV2.NewQuerier(querierOptsV2)
	t.querierV5 = querierV5
	t.reader = reader
	return &t, nil
}

func (r *ThresholdRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeThreshold
}

func (r *ThresholdRule) prepareQueryRange(ctx context.Context, ts time.Time) (*v3.QueryRangeParamsV3, error) {

	r.logger.InfoContext(
		ctx, "prepare query range request v4", "ts", ts.UnixMilli(), "eval_window", r.evalWindow.Milliseconds(), "eval_delay", r.evalDelay.Milliseconds(),
	)

	startTs, endTs := r.Timestamps(ts)
	start, end := startTs.UnixMilli(), endTs.UnixMilli()

	if r.ruleCondition.QueryType() == v3.QueryTypeClickHouseSQL {
		params := &v3.QueryRangeParamsV3{
			Start: start,
			End:   end,
			Step:  int64(math.Max(float64(common.MinAllowedStepInterval(start, end)), 60)),
			CompositeQuery: &v3.CompositeQuery{
				QueryType:         r.ruleCondition.CompositeQuery.QueryType,
				PanelType:         r.ruleCondition.CompositeQuery.PanelType,
				BuilderQueries:    make(map[string]*v3.BuilderQuery),
				ClickHouseQueries: make(map[string]*v3.ClickHouseQuery),
				PromQueries:       make(map[string]*v3.PromQuery),
				Unit:              r.ruleCondition.CompositeQuery.Unit,
			},
			Variables: make(map[string]interface{}, 0),
			NoCache:   true,
		}
		querytemplate.AssignReservedVarsV3(params)
		for name, chQuery := range r.ruleCondition.CompositeQuery.ClickHouseQueries {
			if chQuery.Disabled {
				continue
			}
			tmpl := template.New("clickhouse-query")
			tmpl, err := tmpl.Parse(chQuery.Query)
			if err != nil {
				return nil, err
			}
			var query bytes.Buffer
			err = tmpl.Execute(&query, params.Variables)
			if err != nil {
				return nil, err
			}
			params.CompositeQuery.ClickHouseQueries[name] = &v3.ClickHouseQuery{
				Query:    query.String(),
				Disabled: chQuery.Disabled,
				Legend:   chQuery.Legend,
			}
		}
		return params, nil
	}

	if r.ruleCondition.CompositeQuery != nil && r.ruleCondition.CompositeQuery.BuilderQueries != nil {
		for _, q := range r.ruleCondition.CompositeQuery.BuilderQueries {
			// If the step interval is less than the minimum allowed step interval, set it to the minimum allowed step interval
			if minStep := common.MinAllowedStepInterval(start, end); q.StepInterval < minStep {
				q.StepInterval = minStep
			}

			q.SetShiftByFromFunc()

			if q.DataSource == v3.DataSourceMetrics && constants.UseMetricsPreAggregation() {
				// if the time range is greater than 1 day, and less than 1 week set the step interval to be multiple of 5 minutes
				// if the time range is greater than 1 week, set the step interval to be multiple of 30 mins
				if end-start >= 24*time.Hour.Milliseconds() && end-start < 7*24*time.Hour.Milliseconds() {
					q.StepInterval = int64(math.Round(float64(q.StepInterval)/300)) * 300
				} else if end-start >= 7*24*time.Hour.Milliseconds() {
					q.StepInterval = int64(math.Round(float64(q.StepInterval)/1800)) * 1800
				}
			}
		}
	}

	if r.ruleCondition.CompositeQuery.PanelType != v3.PanelTypeGraph {
		r.ruleCondition.CompositeQuery.PanelType = v3.PanelTypeGraph
	}

	// default mode
	return &v3.QueryRangeParamsV3{
		Start:          start,
		End:            end,
		Step:           int64(math.Max(float64(common.MinAllowedStepInterval(start, end)), 60)),
		CompositeQuery: r.ruleCondition.CompositeQuery,
		Variables:      make(map[string]interface{}, 0),
		NoCache:        true,
	}, nil
}

func (r *ThresholdRule) prepareLinksToLogs(ctx context.Context, ts time.Time, lbls labels.Labels) string {

	if r.version == "v5" {
		return r.prepareLinksToLogsV5(ctx, ts, lbls)
	}

	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return ""
	}
	start := time.UnixMilli(qr.Start)
	end := time.UnixMilli(qr.End)

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	q := r.ruleCondition.CompositeQuery.BuilderQueries[selectedQuery]
	if q == nil {
		return ""
	}

	if q.DataSource != v3.DataSourceLogs {
		return ""
	}

	queryFilter := []v3.FilterItem{}
	if q.Filters != nil {
		queryFilter = q.Filters.Items
	}

	filterItems := contextlinks.PrepareFilters(lbls.Map(), queryFilter, q.GroupBy, r.logsKeys)

	return contextlinks.PrepareLinksToLogs(start, end, filterItems)
}

func (r *ThresholdRule) prepareLinksToTraces(ctx context.Context, ts time.Time, lbls labels.Labels) string {

	if r.version == "v5" {
		return r.prepareLinksToTracesV5(ctx, ts, lbls)
	}

	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRange(ctx, ts)
	if err != nil {
		return ""
	}
	start := time.UnixMilli(qr.Start)
	end := time.UnixMilli(qr.End)

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	q := r.ruleCondition.CompositeQuery.BuilderQueries[selectedQuery]
	if q == nil {
		return ""
	}

	if q.DataSource != v3.DataSourceTraces {
		return ""
	}

	queryFilter := []v3.FilterItem{}
	if q.Filters != nil {
		queryFilter = q.Filters.Items
	}

	filterItems := contextlinks.PrepareFilters(lbls.Map(), queryFilter, q.GroupBy, r.spansKeys)

	return contextlinks.PrepareLinksToTraces(start, end, filterItems)
}

func (r *ThresholdRule) prepareQueryRangeV5(ctx context.Context, ts time.Time) (*qbtypes.QueryRangeRequest, error) {

	r.logger.InfoContext(
		ctx, "prepare query range request v5", "ts", ts.UnixMilli(), "eval_window", r.evalWindow.Milliseconds(), "eval_delay", r.evalDelay.Milliseconds(),
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

func (r *ThresholdRule) prepareLinksToLogsV5(ctx context.Context, ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRangeV5(ctx, ts)
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

func (r *ThresholdRule) prepareLinksToTracesV5(ctx context.Context, ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRangeV5(ctx, ts)
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
	err = r.PopulateTemporality(ctx, orgID, params)
	if err != nil {
		return nil, fmt.Errorf("internal error while setting temporality")
	}

	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		hasLogsQuery := false
		hasTracesQuery := false
		for _, query := range params.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceLogs {
				hasLogsQuery = true
			}
			if query.DataSource == v3.DataSourceTraces {
				hasTracesQuery = true
			}
		}

		if hasLogsQuery {
			// check if any enrichment is required for logs if yes then enrich them
			if logsv3.EnrichmentRequired(params) {
				logsFields, err := r.reader.GetLogFieldsFromNames(ctx, logsv3.GetFieldNames(params.CompositeQuery))
				if err != nil {
					return nil, err
				}
				logsKeys := model.GetLogFieldsV3(ctx, params, logsFields)
				r.logsKeys = logsKeys
				logsv3.Enrich(params, logsKeys)
			}
		}

		if hasTracesQuery {
			spanKeys, err := r.reader.GetSpanAttributeKeysByNames(ctx, logsv3.GetFieldNames(params.CompositeQuery))
			if err != nil {
				return nil, err
			}
			r.spansKeys = spanKeys
			tracesV4.Enrich(params, spanKeys)
		}
	}

	var results []*v3.Result
	var queryErrors map[string]error

	if r.version == "v4" {
		results, queryErrors, err = r.querierV2.QueryRange(ctx, orgID, params)
	} else {
		results, queryErrors, err = r.querier.QueryRange(ctx, orgID, params)
	}

	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get alert query range result", "rule_name", r.Name(), "error", err, "query_errors", queryErrors)
		return nil, fmt.Errorf("internal error while querying")
	}

	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		results, err = postprocess.PostProcessResult(results, params)
		if err != nil {
			r.logger.ErrorContext(ctx, "failed to post process result", "rule_name", r.Name(), "error", err)
			return nil, fmt.Errorf("internal error while post processing")
		}
	}

	selectedQuery := r.GetSelectedQuery()

	var queryResult *v3.Result
	for _, res := range results {
		if res.QueryName == selectedQuery {
			queryResult = res
			break
		}
	}

	if queryResult != nil && len(queryResult.Series) > 0 {
		r.lastTimestampWithDatapoints = time.Now()
	}

	var resultVector ruletypes.Vector

	// if the data is missing for `For` duration then we should send alert
	if r.ruleCondition.AlertOnAbsent && r.lastTimestampWithDatapoints.Add(time.Duration(r.Condition().AbsentFor)*time.Minute).Before(time.Now()) {
		r.logger.InfoContext(ctx, "no data found for rule condition", "rule_id", r.ID())
		lbls := labels.NewBuilder(labels.Labels{})
		if !r.lastTimestampWithDatapoints.IsZero() {
			lbls.Set(ruletypes.LabelLastSeen, r.lastTimestampWithDatapoints.Format(constants.AlertTimeFormat))
		}
		resultVector = append(resultVector, ruletypes.Sample{
			Metric:    lbls.Labels(),
			IsMissing: true,
		})
		return resultVector, nil
	}

	if queryResult == nil {
		r.logger.WarnContext(ctx, "query result is nil", "rule_name", r.Name(), "query_name", selectedQuery)
		return resultVector, nil
	}

	for _, series := range queryResult.Series {
		if r.Condition() != nil && r.Condition().RequireMinPoints {
			if len(series.Points) < r.ruleCondition.RequiredNumPoints {
				r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Points), "requiredPoints", r.Condition().RequiredNumPoints)
				continue
			}
		}
		resultSeries, err := r.Threshold.Eval(*series, r.Unit(), ruletypes.EvalData{
			ActiveAlerts: r.ActiveAlertsLabelFP(),
		})
		if err != nil {
			return nil, err
		}
		resultVector = append(resultVector, resultSeries...)
	}

	return resultVector, nil
}

func (r *ThresholdRule) buildAndRunQueryV5(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {

	params, err := r.prepareQueryRangeV5(ctx, ts)
	if err != nil {
		return nil, err
	}

	var results []*v3.Result

	v5Result, err := r.querierV5.QueryRange(ctx, orgID, params)

	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get alert query result", "rule_name", r.Name(), "error", err)
		return nil, fmt.Errorf("internal error while querying")
	}

	for _, item := range v5Result.Data.Results {
		if tsData, ok := item.(*qbtypes.TimeSeriesData); ok {
			results = append(results, transition.ConvertV5TimeSeriesDataToV4Result(tsData))
		} else {
			// NOTE: should not happen but just to ensure we don't miss it if it happens for some reason
			r.logger.WarnContext(ctx, "expected qbtypes.TimeSeriesData but got", "item_type", reflect.TypeOf(item))
		}
	}

	selectedQuery := r.GetSelectedQuery()

	var queryResult *v3.Result
	for _, res := range results {
		if res.QueryName == selectedQuery {
			queryResult = res
			break
		}
	}

	if queryResult != nil && len(queryResult.Series) > 0 {
		r.lastTimestampWithDatapoints = time.Now()
	}

	var resultVector ruletypes.Vector

	// if the data is missing for `For` duration then we should send alert
	if r.ruleCondition.AlertOnAbsent && r.lastTimestampWithDatapoints.Add(time.Duration(r.Condition().AbsentFor)*time.Minute).Before(time.Now()) {
		r.logger.InfoContext(ctx, "no data found for rule condition", "rule_id", r.ID())
		lbls := labels.NewBuilder(labels.Labels{})
		if !r.lastTimestampWithDatapoints.IsZero() {
			lbls.Set(ruletypes.LabelLastSeen, r.lastTimestampWithDatapoints.Format(constants.AlertTimeFormat))
		}
		resultVector = append(resultVector, ruletypes.Sample{
			Metric:    lbls.Labels(),
			IsMissing: true,
		})
		return resultVector, nil
	}

	if queryResult == nil {
		r.logger.WarnContext(ctx, "query result is nil", "rule_name", r.Name(), "query_name", selectedQuery)
		return resultVector, nil
	}

	for _, series := range queryResult.Series {
		if r.Condition() != nil && r.Condition().RequireMinPoints {
			if len(series.Points) < r.Condition().RequiredNumPoints {
				r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Points), "requiredPoints", r.Condition().RequiredNumPoints)
				continue
			}
		}
		resultSeries, err := r.Threshold.Eval(*series, r.Unit(), ruletypes.EvalData{
			ActiveAlerts: r.ActiveAlertsLabelFP(),
		})
		if err != nil {
			return nil, err
		}
		resultVector = append(resultVector, resultSeries...)
	}

	return resultVector, nil
}

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time) (interface{}, error) {

	prevState := r.State()

	valueFormatter := formatter.FromUnit(r.Unit())

	var res ruletypes.Vector
	var err error

	if r.version == "v5" {
		r.logger.InfoContext(ctx, "running v5 query")
		res, err = r.buildAndRunQueryV5(ctx, r.orgID, ts)
	} else {
		r.logger.InfoContext(ctx, "running v4 query")
		res, err = r.buildAndRunQuery(ctx, r.orgID, ts)
	}

	if err != nil {
		return nil, err
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
		//todo(aniket): handle different threshold
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
			return nil, fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
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

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration {
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
		EvalWindow:        ruletypes.Duration(r.evalWindow),
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

func removeGroupinSetPoints(series v3.Series) []v3.Point {
	var result []v3.Point
	for _, s := range series.Points {
		if s.Timestamp >= 0 && !math.IsNaN(s.Value) && !math.IsInf(s.Value, 0) {
			result = append(result, s)
		}
	}
	return result
}
