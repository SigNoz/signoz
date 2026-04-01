package rules

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"math"
	"net/url"
	"reflect"
	"text/template"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/postprocess"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"
	logsv3 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v3"
	"github.com/SigNoz/signoz/pkg/query-service/app/querier"
	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	querytemplate "github.com/SigNoz/signoz/pkg/query-service/utils/queryTemplate"

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
			Variables: make(map[string]interface{}),
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

			if q.DataSource == v3.DataSourceMetrics {
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
		Variables:      make(map[string]interface{}),
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

func (r *ThresholdRule) prepareQueryRangeV5(ctx context.Context, ts time.Time) *qbtypes.QueryRangeRequest {
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
	return req
}

func (r *ThresholdRule) prepareLinksToLogsV5(ctx context.Context, ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	qr := r.prepareQueryRangeV5(ctx, ts)
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

	qr := r.prepareQueryRangeV5(ctx, ts)
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
				logsFields, apiErr := r.reader.GetLogFieldsFromNames(ctx, logsv3.GetFieldNames(params.CompositeQuery))
				if apiErr != nil {
					return nil, apiErr.ToError()
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
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "rules",
		instrumentationtypes.CodeFunctionName: "buildAndRunQuery",
	})
	if r.version == "v4" {
		results, queryErrors, err = r.querierV2.QueryRange(ctx, orgID, params)
	} else {
		results, queryErrors, err = r.querier.QueryRange(ctx, orgID, params)
	}

	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get alert query range result", "rule_name", r.Name(), errors.Attr(err), "query_errors", queryErrors)
		return nil, fmt.Errorf("internal error while querying")
	}

	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		results, err = postprocess.PostProcessResult(results, params)
		if err != nil {
			r.logger.ErrorContext(ctx, "failed to post process result", "rule_name", r.Name(), errors.Attr(err))
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

	hasData := queryResult != nil && len(queryResult.Series) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	if queryResult == nil {
		r.logger.WarnContext(ctx, "query result is nil", "rule_name", r.Name(), "query_name", selectedQuery)
		return resultVector, nil
	}

	for _, series := range queryResult.Series {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Points), "requiredPoints", r.Condition().RequiredNumPoints)
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

func (r *ThresholdRule) buildAndRunQueryV5(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {
	params := r.prepareQueryRangeV5(ctx, ts)

	var results []*v3.Result

	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "rules",
		instrumentationtypes.CodeFunctionName: "buildAndRunQueryV5",
	})

	v5Result, err := r.querierV5.QueryRange(ctx, orgID, params)
	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get alert query result", "rule_name", r.Name(), errors.Attr(err))
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

	hasData := queryResult != nil && len(queryResult.Series) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	if queryResult == nil {
		r.logger.WarnContext(ctx, "query result is nil", "rule_name", r.Name(), "query_name", selectedQuery)
		return resultVector, nil
	}

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := queryResult.Series
	if r.ShouldSkipNewGroups() {
		filteredSeries, filterErr := r.BaseRule.FilterNewSeries(ctx, ts, seriesToProcess)
		// In case of error we log the error and continue with the original series
		if filterErr != nil {
			r.logger.ErrorContext(ctx, "Error filtering new series, ", errors.Attr(filterErr), "rule_name", r.Name())
		} else {
			seriesToProcess = filteredSeries
		}
	}

	for _, series := range seriesToProcess {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Points), "requiredPoints", r.Condition().RequiredNumPoints)
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
		return 0, err
	}

	opts := EvalVectorOptions{
		DeleteLabels: []string{labels.MetricNameLabel, labels.TemporalityLabel},
		ExtraAnnotations: func(ctx context.Context, ts time.Time, smpl labels.Labels) []labels.Label {
			host := r.hostFromSource()
			if host == "" {
				return nil
			}

			//// Links with timestamps should go in annotations since labels
			//// is used alert grouping, and we want to group alerts with the same
			//// label set, but different timestamps, together.
			switch r.typ { // DIFF
			case ruletypes.AlertTypeTraces:
				if link := r.prepareLinksToTraces(ctx, ts, smpl); link != "" {
					r.logger.InfoContext(ctx, "adding traces link to annotations", "link", fmt.Sprintf("%s/traces-explorer?%s", host, link))
					return []labels.Label{{Name: "related_traces", Value: fmt.Sprintf("%s/traces-explorer?%s", host, link)}}
				}
			case ruletypes.AlertTypeLogs:
				if link := r.prepareLinksToLogs(ctx, ts, smpl); link != "" {
					r.logger.InfoContext(ctx, "adding logs link to annotations", "link", fmt.Sprintf("%s/logs/logs-explorer?%s", host, link))
					return []labels.Label{{Name: "related_logs", Value: fmt.Sprintf("%s/logs/logs-explorer?%s", host, link)}}
				}
			}
			return nil
		},
	}
	return r.EvalVector(ctx, ts, res, opts)
}
