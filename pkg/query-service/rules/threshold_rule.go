package rules

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"text/template"
	"time"

	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/contextlinks"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/postprocess"

	"go.signoz.io/signoz/pkg/query-service/app/querier"
	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"

	logsv3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	tracesV4 "go.signoz.io/signoz/pkg/query-service/app/traces/v4"
	"go.signoz.io/signoz/pkg/query-service/formatter"

	yaml "gopkg.in/yaml.v2"
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

	// used for attribute metadata enrichment for logs and traces
	logsKeys  map[string]v3.AttributeKey
	spansKeys map[string]v3.AttributeKey

	useTraceNewSchema bool
}

func NewThresholdRule(
	id string,
	p *PostableRule,
	featureFlags interfaces.FeatureLookup,
	reader interfaces.Reader,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	opts ...RuleOption,
) (*ThresholdRule, error) {

	zap.L().Info("creating new ThresholdRule", zap.String("id", id), zap.Any("opts", opts))

	baseRule, err := NewBaseRule(id, p, reader, opts...)
	if err != nil {
		return nil, err
	}

	t := ThresholdRule{
		BaseRule:          baseRule,
		version:           p.Version,
		useTraceNewSchema: useTraceNewSchema,
	}

	querierOption := querier.QuerierOptions{
		Reader:            reader,
		Cache:             nil,
		KeyGenerator:      queryBuilder.NewKeyGenerator(),
		FeatureLookup:     featureFlags,
		UseLogsNewSchema:  useLogsNewSchema,
		UseTraceNewSchema: useTraceNewSchema,
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:            reader,
		Cache:             nil,
		KeyGenerator:      queryBuilder.NewKeyGenerator(),
		FeatureLookup:     featureFlags,
		UseLogsNewSchema:  useLogsNewSchema,
		UseTraceNewSchema: useTraceNewSchema,
	}

	t.querier = querier.NewQuerier(querierOption)
	t.querierV2 = querierV2.NewQuerier(querierOptsV2)
	t.reader = reader
	return &t, nil
}

func (r *ThresholdRule) Type() RuleType {
	return RuleTypeThreshold
}

func (r *ThresholdRule) prepareQueryRange(ts time.Time) (*v3.QueryRangeParamsV3, error) {

	zap.L().Info("prepareQueryRange", zap.Int64("ts", ts.UnixMilli()), zap.Int64("evalWindow", r.evalWindow.Milliseconds()), zap.Int64("evalDelay", r.evalDelay.Milliseconds()))

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

func (r *ThresholdRule) prepareLinksToLogs(ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRange(ts)
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

func (r *ThresholdRule) prepareLinksToTraces(ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	qr, err := r.prepareQueryRange(ts)
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

func (r *ThresholdRule) GetSelectedQuery() string {
	return r.ruleCondition.GetSelectedQueryName()
}

func (r *ThresholdRule) buildAndRunQuery(ctx context.Context, ts time.Time) (Vector, error) {

	params, err := r.prepareQueryRange(ts)
	if err != nil {
		return nil, err
	}
	err = r.PopulateTemporality(ctx, params)
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
				logsFields, err := r.reader.GetLogFields(ctx)
				if err != nil {
					return nil, err
				}
				logsKeys := model.GetLogFieldsV3(ctx, params, logsFields)
				r.logsKeys = logsKeys
				logsv3.Enrich(params, logsKeys)
			}
		}

		if hasTracesQuery {
			spanKeys, err := r.reader.GetSpanAttributeKeys(ctx)
			if err != nil {
				return nil, err
			}
			r.spansKeys = spanKeys
			if r.useTraceNewSchema {
				tracesV4.Enrich(params, spanKeys)
			} else {
				tracesV3.Enrich(params, spanKeys)
			}
		}
	}

	var results []*v3.Result
	var queryErrors map[string]error

	if r.version == "v4" {
		results, queryErrors, err = r.querierV2.QueryRange(ctx, params)
	} else {
		results, queryErrors, err = r.querier.QueryRange(ctx, params)
	}

	if err != nil {
		zap.L().Error("failed to get alert query result", zap.String("rule", r.Name()), zap.Error(err), zap.Any("errors", queryErrors))
		return nil, fmt.Errorf("internal error while querying")
	}

	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		results, err = postprocess.PostProcessResult(results, params)
		if err != nil {
			zap.L().Error("failed to post process result", zap.String("rule", r.Name()), zap.Error(err))
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

	var resultVector Vector

	// if the data is missing for `For` duration then we should send alert
	if r.ruleCondition.AlertOnAbsent && r.lastTimestampWithDatapoints.Add(time.Duration(r.Condition().AbsentFor)*time.Minute).Before(time.Now()) {
		zap.L().Info("no data found for rule condition", zap.String("ruleid", r.ID()))
		lbls := labels.NewBuilder(labels.Labels{})
		if !r.lastTimestampWithDatapoints.IsZero() {
			lbls.Set("lastSeen", r.lastTimestampWithDatapoints.Format(constants.AlertTimeFormat))
		}
		resultVector = append(resultVector, Sample{
			Metric:    lbls.Labels(),
			IsMissing: true,
		})
		return resultVector, nil
	}

	for _, series := range queryResult.Series {
		smpl, shouldAlert := r.ShouldAlert(*series)
		if shouldAlert {
			resultVector = append(resultVector, smpl)
		}
	}
	return resultVector, nil
}

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time) (interface{}, error) {

	prevState := r.State()

	valueFormatter := formatter.FromUnit(r.Unit())
	res, err := r.buildAndRunQuery(ctx, ts)

	if err != nil {
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var alerts = make(map[uint64]*Alert, len(res))

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		value := valueFormatter.Format(smpl.V, r.Unit())
		threshold := valueFormatter.Format(r.targetVal(), r.Unit())
		zap.L().Debug("Alert template data for rule", zap.String("name", r.Name()), zap.String("formatter", valueFormatter.Name()), zap.String("value", value), zap.String("threshold", threshold))

		tmplData := AlertTemplateData(l, value, threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		// utility function to apply go template on labels and annotations
		expand := func(text string) string {

			tmpl := NewTemplateExpander(
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
				zap.L().Error("Expanding alert template failed", zap.Error(err), zap.Any("data", tmplData))
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
		}

		// Links with timestamps should go in annotations since labels
		// is used alert grouping, and we want to group alerts with the same
		// label set, but different timestamps, together.
		if r.typ == AlertTypeTraces {
			link := r.prepareLinksToTraces(ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				zap.L().Info("adding traces link to annotations", zap.String("link", fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)))
				annotations = append(annotations, labels.Label{Name: "related_traces", Value: fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)})
			}
		} else if r.typ == AlertTypeLogs {
			link := r.prepareLinksToLogs(ts, smpl.Metric)
			if link != "" && r.hostFromSource() != "" {
				zap.L().Info("adding logs link to annotations", zap.String("link", fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)))
				annotations = append(annotations, labels.Label{Name: "related_logs", Value: fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)})
			}
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			zap.L().Error("the alert query returns duplicate records", zap.String("ruleid", r.ID()), zap.Any("alert", alerts[h]))
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			return nil, err
		}

		alerts[h] = &Alert{
			Labels:            lbs,
			QueryResultLables: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             model.StatePending,
			Value:             smpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         r.preferredChannels,
			Missing:           smpl.IsMissing,
		}
	}

	zap.L().Info("number of alerts found", zap.String("name", r.Name()), zap.Int("count", len(alerts)))

	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != model.StateInactive {

			alert.Value = a.Value
			alert.Annotations = a.Annotations
			alert.Receivers = r.preferredChannels
			continue
		}

		r.Active[h] = a
	}

	itemsToAdd := []model.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.Active {
		labelsJSON, err := json.Marshal(a.QueryResultLables)
		if err != nil {
			zap.L().Error("error marshaling labels", zap.Error(err), zap.Any("labels", a.Labels))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == model.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ResolvedRetention) {
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

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration {
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
	}

	currentState := r.State()

	overallStateChanged := currentState != prevState
	for idx, item := range itemsToAdd {
		item.OverallStateChanged = overallStateChanged
		item.OverallState = currentState
		itemsToAdd[idx] = item
	}

	r.RecordRuleStateHistory(ctx, prevState, currentState, itemsToAdd)

	r.health = HealthGood
	r.lastError = err

	return len(r.Active), nil
}

func (r *ThresholdRule) String() string {

	ar := PostableRule{
		AlertName:         r.name,
		RuleCondition:     r.ruleCondition,
		EvalWindow:        Duration(r.evalWindow),
		Labels:            r.labels.Map(),
		Annotations:       r.annotations.Map(),
		PreferredChannels: r.preferredChannels,
	}

	byt, err := yaml.Marshal(ar)
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
