package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/anomaly"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/transition"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"

	"github.com/SigNoz/signoz/pkg/query-service/formatter"

	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"

	querierV5 "github.com/SigNoz/signoz/pkg/querier"

	anomalyV2 "github.com/SigNoz/signoz/ee/anomaly"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	yaml "gopkg.in/yaml.v2"
)

const (
	RuleTypeAnomaly = "anomaly_rule"
)

type AnomalyRule struct {
	*baserules.BaseRule

	mtx sync.Mutex

	reader interfaces.Reader

	// querierV2 is used for alerts created after the introduction of new metrics query builder
	querierV2 interfaces.Querier

	// querierV5 is used for alerts migrated after the introduction of new query builder
	querierV5 querierV5.Querier

	provider   anomaly.Provider
	providerV2 anomalyV2.Provider

	version string
	logger  *slog.Logger

	seasonality anomaly.Seasonality
}

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

	if p.RuleCondition.CompareOp == ruletypes.ValueIsBelow {
		target := -1 * *p.RuleCondition.Target
		p.RuleCondition.Target = &target
	}

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

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:       reader,
		Cache:        cache,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
	}

	t.querierV2 = querierV2.NewQuerier(querierOptsV2)
	t.reader = reader
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

	t.querierV5 = querierV5
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

	start := ts.Add(-time.Duration(r.EvalWindow())).UnixMilli()
	end := ts.UnixMilli()

	if r.EvalDelay() > 0 {
		start = start - int64(r.EvalDelay().Milliseconds())
		end = end - int64(r.EvalDelay().Milliseconds())
	}
	// round to minute otherwise we could potentially miss data
	start = start - (start % (60 * 1000))
	end = end - (end % (60 * 1000))

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

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(queryResult.AnomalyScores)
	r.logger.InfoContext(ctx, "anomaly scores", "scores", string(scoresJSON))

	for _, series := range queryResult.AnomalyScores {
		smpl, shouldAlert := r.ShouldAlert(*series)
		if shouldAlert {
			resultVector = append(resultVector, smpl)
		}
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

	var resultVector ruletypes.Vector

	scoresJSON, _ := json.Marshal(queryResult.AnomalyScores)
	r.logger.InfoContext(ctx, "anomaly scores", "scores", string(scoresJSON))

	for _, series := range queryResult.AnomalyScores {
		smpl, shouldAlert := r.ShouldAlert(*series)
		if shouldAlert {
			resultVector = append(resultVector, smpl)
		}
	}
	return resultVector, nil
}

func (r *AnomalyRule) Eval(ctx context.Context, ts time.Time) (interface{}, error) {

	prevState := r.State()

	valueFormatter := formatter.FromUnit(r.Unit())

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
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var alerts = make(map[uint64]*ruletypes.Alert, len(res))

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		value := valueFormatter.Format(smpl.V, r.Unit())
		threshold := valueFormatter.Format(r.TargetVal(), r.Unit())
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
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			r.logger.ErrorContext(ctx, "the alert query returns duplicate records", "rule_id", r.ID(), "alert", alerts[h])
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			return nil, err
		}

		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLables: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             model.StatePending,
			Value:             smpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         r.PreferredChannels(),
			Missing:           smpl.IsMissing,
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
			alert.Receivers = r.PreferredChannels()
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

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.HoldDuration() {
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

	return len(r.Active), nil
}

func (r *AnomalyRule) String() string {

	ar := ruletypes.PostableRule{
		AlertName:         r.Name(),
		RuleCondition:     r.Condition(),
		EvalWindow:        ruletypes.Duration(r.EvalWindow()),
		Labels:            r.Labels().Map(),
		Annotations:       r.Annotations().Map(),
		PreferredChannels: r.PreferredChannels(),
	}

	byt, err := yaml.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}
