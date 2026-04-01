package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/anomaly"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"

	anomalyV2 "github.com/SigNoz/signoz/ee/anomaly"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const (
	RuleTypeAnomaly = "anomaly_rule"
)

type AnomalyRule struct {
	*baserules.BaseRule

	provider   anomaly.Provider
	providerV2 anomalyV2.Provider

	version string
	logger  *slog.Logger

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
		t.provider = anomaly.NewHourlyProvider(
			anomaly.WithCache[*anomaly.HourlyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.HourlyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.HourlyProvider](reader),
		)
	} else if t.seasonality == anomaly.SeasonalityDaily {
		t.provider = anomaly.NewDailyProvider(
			anomaly.WithCache[*anomaly.DailyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.DailyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.DailyProvider](reader),
		)
	} else if t.seasonality == anomaly.SeasonalityWeekly {
		t.provider = anomaly.NewWeeklyProvider(
			anomaly.WithCache[*anomaly.WeeklyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.WeeklyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.WeeklyProvider](reader),
		)
	}

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

	t.version = p.Version
	t.logger = logger
	return &t, nil
}

func (r *AnomalyRule) Type() ruletypes.RuleType {
	return RuleTypeAnomaly
}

func (r *AnomalyRule) prepareQueryRange(ctx context.Context, ts time.Time) (*v3.QueryRangeParamsV3, error) {

	r.logger.InfoContext(
		ctx, "prepare query range request v4", "ts", ts.UnixMilli(), "eval_window", r.EvalWindow().Milliseconds(), "eval_delay", r.EvalDelay().Milliseconds(),
	)

	st, en := r.Timestamps(ts)
	start := st.UnixMilli()
	end := en.UnixMilli()

	compositeQuery := r.Condition().CompositeQuery

	if compositeQuery.PanelType != v3.PanelTypeGraph {
		compositeQuery.PanelType = v3.PanelTypeGraph
	}

	// default mode
	return &v3.QueryRangeParamsV3{
		Start:          start,
		End:            end,
		Step:           int64(math.Max(float64(common.MinAllowedStepInterval(start, end)), 60)),
		CompositeQuery: compositeQuery,
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}, nil
}

func (r *AnomalyRule) prepareQueryRangeV5(ctx context.Context, ts time.Time) (*qbtypes.QueryRangeRequest, error) {

	r.logger.InfoContext(ctx, "prepare query range request v5", "ts", ts.UnixMilli(), "eval_window", r.EvalWindow().Milliseconds(), "eval_delay", r.EvalDelay().Milliseconds())

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
	err = r.PopulateTemporality(ctx, orgID, params)
	if err != nil {
		return nil, fmt.Errorf("internal error while setting temporality")
	}

	anomalies, err := r.provider.GetAnomalies(ctx, orgID, &anomaly.GetAnomaliesRequest{
		Params:      params,
		Seasonality: r.seasonality,
	})
	if err != nil {
		return nil, err
	}

	var queryResult *v3.Result
	for _, result := range anomalies.Results {
		if result.QueryName == r.GetSelectedQuery() {
			queryResult = result
			break
		}
	}

	hasData := len(queryResult.AnomalyScores) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(queryResult.AnomalyScores)
	r.logger.InfoContext(ctx, "anomaly scores", "scores", string(scoresJSON))

	for _, series := range queryResult.AnomalyScores {
		if !r.Condition().ShouldEval(series) {
			r.logger.InfoContext(ctx, "not enough data points to evaluate series, skipping", "ruleid", r.ID(), "numPoints", len(series.Points), "requiredPoints", r.Condition().RequiredNumPoints)
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

func (r *AnomalyRule) buildAndRunQueryV5(ctx context.Context, orgID valuer.UUID, ts time.Time) (ruletypes.Vector, error) {

	params, err := r.prepareQueryRangeV5(ctx, ts)
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

	queryResult := transition.ConvertV5TimeSeriesDataToV4Result(qbResult)

	hasData := len(queryResult.AnomalyScores) > 0
	if missingDataAlert := r.HandleMissingDataAlert(ctx, ts, hasData); missingDataAlert != nil {
		return ruletypes.Vector{*missingDataAlert}, nil
	}

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(queryResult.AnomalyScores)
	r.logger.InfoContext(ctx, "anomaly scores", "scores", string(scoresJSON))

	// Filter out new series if newGroupEvalDelay is configured
	seriesToProcess := queryResult.AnomalyScores
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
	var res ruletypes.Vector
	var err error
	if r.version == "v5" {
		r.logger.InfoContext(ctx, "running v5 query")
		res, err = r.buildAndRunQueryV5(ctx, r.OrgID(), ts)
	} else {
		r.logger.InfoContext(ctx, "running v4 query")
		res, err = r.buildAndRunQuery(ctx, r.OrgID(), ts)
	}
	if err != nil {
		return 0, err
	}

	opts := baserules.EvalVectorOptions{
		DeleteLabels: []string{labels.MetricNameLabel, labels.TemporalityLabel},
	}
	return r.EvalVector(ctx, ts, res, opts)
}
