package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"

	"go.signoz.io/signoz/ee/query-service/anomaly"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"

	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"

	"go.signoz.io/signoz/pkg/query-service/formatter"

	baserules "go.signoz.io/signoz/pkg/query-service/rules"

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

	provider anomaly.Provider

	seasonality anomaly.Seasonality
}

func NewAnomalyRule(
	id string,
	p *baserules.PostableRule,
	featureFlags interfaces.FeatureLookup,
	reader interfaces.Reader,
	cache cache.Cache,
	opts ...baserules.RuleOption,
) (*AnomalyRule, error) {

	zap.L().Info("creating new AnomalyRule", zap.String("id", id), zap.Any("opts", opts))

	if p.RuleCondition.CompareOp == baserules.ValueIsBelow {
		target := -1 * *p.RuleCondition.Target
		p.RuleCondition.Target = &target
	}

	baseRule, err := baserules.NewBaseRule(id, p, reader, opts...)
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

	zap.L().Info("using seasonality", zap.String("seasonality", t.seasonality.String()))

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:        reader,
		Cache:         cache,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FeatureLookup: featureFlags,
	}

	t.querierV2 = querierV2.NewQuerier(querierOptsV2)
	t.reader = reader
	if t.seasonality == anomaly.SeasonalityHourly {
		t.provider = anomaly.NewHourlyProvider(
			anomaly.WithCache[*anomaly.HourlyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.HourlyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.HourlyProvider](reader),
			anomaly.WithFeatureLookup[*anomaly.HourlyProvider](featureFlags),
		)
	} else if t.seasonality == anomaly.SeasonalityDaily {
		t.provider = anomaly.NewDailyProvider(
			anomaly.WithCache[*anomaly.DailyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.DailyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.DailyProvider](reader),
			anomaly.WithFeatureLookup[*anomaly.DailyProvider](featureFlags),
		)
	} else if t.seasonality == anomaly.SeasonalityWeekly {
		t.provider = anomaly.NewWeeklyProvider(
			anomaly.WithCache[*anomaly.WeeklyProvider](cache),
			anomaly.WithKeyGenerator[*anomaly.WeeklyProvider](queryBuilder.NewKeyGenerator()),
			anomaly.WithReader[*anomaly.WeeklyProvider](reader),
			anomaly.WithFeatureLookup[*anomaly.WeeklyProvider](featureFlags),
		)
	}
	return &t, nil
}

func (r *AnomalyRule) Type() baserules.RuleType {
	return RuleTypeAnomaly
}

func (r *AnomalyRule) prepareQueryRange(ts time.Time) (*v3.QueryRangeParamsV3, error) {

	zap.L().Info("prepareQueryRange", zap.Int64("ts", ts.UnixMilli()), zap.Int64("evalWindow", r.EvalWindow().Milliseconds()), zap.Int64("evalDelay", r.EvalDelay().Milliseconds()))

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

func (r *AnomalyRule) GetSelectedQuery() string {
	return r.Condition().GetSelectedQueryName()
}

func (r *AnomalyRule) buildAndRunQuery(ctx context.Context, ts time.Time) (baserules.Vector, error) {

	params, err := r.prepareQueryRange(ts)
	if err != nil {
		return nil, err
	}
	err = r.PopulateTemporality(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("internal error while setting temporality")
	}

	anomalies, err := r.provider.GetAnomalies(ctx, &anomaly.GetAnomaliesRequest{
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

	var resultVector baserules.Vector

	scoresJSON, _ := json.Marshal(queryResult.AnomalyScores)
	zap.L().Info("anomaly scores", zap.String("scores", string(scoresJSON)))

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
	res, err := r.buildAndRunQuery(ctx, ts)

	if err != nil {
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var alerts = make(map[uint64]*baserules.Alert, len(res))

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		value := valueFormatter.Format(smpl.V, r.Unit())
		threshold := valueFormatter.Format(r.TargetVal(), r.Unit())
		zap.L().Debug("Alert template data for rule", zap.String("name", r.Name()), zap.String("formatter", valueFormatter.Name()), zap.String("value", value), zap.String("threshold", threshold))

		tmplData := baserules.AlertTemplateData(l, value, threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		// utility function to apply go template on labels and annotations
		expand := func(text string) string {

			tmpl := baserules.NewTemplateExpander(
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
			zap.L().Error("the alert query returns duplicate records", zap.String("ruleid", r.ID()), zap.Any("alert", alerts[h]))
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			return nil, err
		}

		alerts[h] = &baserules.Alert{
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

	zap.L().Info("number of alerts found", zap.String("name", r.Name()), zap.Int("count", len(alerts)))

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
			zap.L().Error("error marshaling labels", zap.Error(err), zap.Any("labels", a.Labels))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == model.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > baserules.ResolvedRetention) {
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

	ar := baserules.PostableRule{
		AlertName:         r.Name(),
		RuleCondition:     r.Condition(),
		EvalWindow:        baserules.Duration(r.EvalWindow()),
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
