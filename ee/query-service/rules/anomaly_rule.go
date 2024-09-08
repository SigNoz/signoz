package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"sort"
	"sync"
	"time"
	"unicode"

	"go.uber.org/zap"

	"go.signoz.io/signoz/ee/query-service/anomaly"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/converter"

	"go.signoz.io/signoz/pkg/query-service/app/querier"
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
	// temporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	temporalityMap map[string]map[v3.Temporality]bool

	active map[uint64]*baserules.Alert
	mtx    sync.Mutex

	reader interfaces.Reader

	// querier is used for alerts created before the introduction of new metrics query builder
	querier interfaces.Querier
	// querierV2 is used for alerts created after the introduction of new metrics query builder
	querierV2 interfaces.Querier

	hourlyAnomalyProvider anomaly.Provider
	dailyAnomalyProvider  anomaly.Provider
	weeklyAnomalyProvider anomaly.Provider
}

func NewAnomalyRule(
	id string,
	p *baserules.PostableRule,
	featureFlags interfaces.FeatureLookup,
	reader interfaces.Reader,
	cache cache.Cache,
	opts ...baserules.RuleOption,
) (*AnomalyRule, error) {

	zap.L().Info("creating new ThresholdRule", zap.String("id", id), zap.Any("opts", opts))

	baseRule, err := baserules.NewBaseRule(id, p, reader, opts...)
	if err != nil {
		return nil, err
	}

	t := AnomalyRule{
		BaseRule:       baseRule,
		temporalityMap: make(map[string]map[v3.Temporality]bool),
	}

	querierOption := querier.QuerierOptions{
		Reader:        reader,
		Cache:         nil,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FeatureLookup: featureFlags,
	}

	querierOptsV2 := querierV2.QuerierOptions{
		Reader:        reader,
		Cache:         nil,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FeatureLookup: featureFlags,
	}

	t.querier = querier.NewQuerier(querierOption)
	t.querierV2 = querierV2.NewQuerier(querierOptsV2)
	t.reader = reader
	t.hourlyAnomalyProvider = anomaly.NewHourlyProvider(
		anomaly.WithCache[*anomaly.HourlyProvider](cache),
		anomaly.WithKeyGenerator[*anomaly.HourlyProvider](queryBuilder.NewKeyGenerator()),
		anomaly.WithReader[*anomaly.HourlyProvider](reader),
		anomaly.WithFeatureLookup[*anomaly.HourlyProvider](featureFlags),
	)
	t.dailyAnomalyProvider = anomaly.NewDailyProvider(
		anomaly.WithCache[*anomaly.DailyProvider](cache),
		anomaly.WithKeyGenerator[*anomaly.DailyProvider](queryBuilder.NewKeyGenerator()),
		anomaly.WithReader[*anomaly.DailyProvider](reader),
		anomaly.WithFeatureLookup[*anomaly.DailyProvider](featureFlags),
	)
	t.weeklyAnomalyProvider = anomaly.NewWeeklyProvider(
		anomaly.WithCache[*anomaly.WeeklyProvider](cache),
		anomaly.WithKeyGenerator[*anomaly.WeeklyProvider](queryBuilder.NewKeyGenerator()),
		anomaly.WithReader[*anomaly.WeeklyProvider](reader),
		anomaly.WithFeatureLookup[*anomaly.WeeklyProvider](featureFlags),
	)
	return &t, nil
}

func (r *AnomalyRule) Type() baserules.RuleType {
	return RuleTypeAnomaly
}

func (r *AnomalyRule) targetVal() float64 {
	if r.Condition() == nil || r.Condition().Target == nil {
		return 0
	}

	// get the converter for the target unit
	unitConverter := converter.FromUnit(converter.Unit(r.Condition().TargetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(converter.Value{
		F: *r.Condition().Target,
		U: converter.Unit(r.Condition().TargetUnit),
	}, converter.Unit(r.Unit()))

	return value.F
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
		NoCache:        true,
	}, nil
}

func (r *AnomalyRule) GetSelectedQuery() string {
	if r.Condition() != nil {
		if r.Condition().SelectedQuery != "" {
			return r.Condition().SelectedQuery
		}

		queryNames := map[string]struct{}{}

		if r.Condition().CompositeQuery != nil {
			if r.Condition().QueryType() == v3.QueryTypeBuilder {
				for name := range r.Condition().CompositeQuery.BuilderQueries {
					queryNames[name] = struct{}{}
				}
			} else if r.Condition().QueryType() == v3.QueryTypeClickHouseSQL {
				for name := range r.Condition().CompositeQuery.ClickHouseQueries {
					queryNames[name] = struct{}{}
				}
			}
		}

		// The following logic exists for backward compatibility
		// If there is no selected query, then
		// - check if F1 is present, if yes, return F1
		// - else return the query with max ascii value
		// this logic is not really correct. we should be considering
		// whether the query is enabled or not. but this is a temporary
		// fix to support backward compatibility
		if _, ok := queryNames["F1"]; ok {
			return "F1"
		}
		keys := make([]string, 0, len(queryNames))
		for k := range queryNames {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		return keys[len(keys)-1]
	}
	// This should never happen
	return ""
}

func (r *AnomalyRule) buildAndRunQuery(ctx context.Context, ts time.Time) (baserules.Vector, error) {

	params, err := r.prepareQueryRange(ts)
	if err != nil {
		return nil, err
	}
	err = r.populateTemporality(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("internal error while setting temporality")
	}

	anomalies, err := r.anomalyProvider.GetAnomalies(ctx, &anomaly.GetAnomaliesRequest{
		Params:      params,
		Seasonality: anomaly.SeasonalityWeekly,
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

	for _, series := range queryResult.Series {
		smpl, shouldAlert := r.ShouldAlert(*series)
		if shouldAlert {
			resultVector = append(resultVector, smpl)
		}
	}
	return resultVector, nil
}

func normalizeLabelName(name string) string {
	// See https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels

	// Regular expression to match non-alphanumeric characters except underscores
	reg := regexp.MustCompile(`[^a-zA-Z0-9_]`)

	// Replace all non-alphanumeric characters except underscores with underscores
	normalized := reg.ReplaceAllString(name, "_")

	// If the first character is not a letter or an underscore, prepend an underscore
	if len(normalized) > 0 && !unicode.IsLetter(rune(normalized[0])) && normalized[0] != '_' {
		normalized = "_" + normalized
	}

	return normalized
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
		threshold := valueFormatter.Format(r.targetVal(), r.Unit())
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
		resultLabels := labels.NewBuilder(smpl.MetricOrig).Del(labels.MetricNameLabel).Del(labels.TemporalityLabel).Labels()

		for name, value := range r.Labels().Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(labels.AlertNameLabel, r.Name())
		lb.Set(labels.AlertRuleIdLabel, r.ID())
		lb.Set(labels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(labels.Labels, 0, len(r.Annotations().Map()))
		for name, value := range r.Annotations().Map() {
			annotations = append(annotations, labels.Label{Name: normalizeLabelName(name), Value: expand(value)})
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
			State:             baserules.StatePending,
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
		if alert, ok := r.active[h]; ok && alert.State != baserules.StateInactive {

			alert.Value = a.Value
			alert.Annotations = a.Annotations
			alert.Receivers = r.PreferredChannels()
			continue
		}

		r.active[h] = a
	}

	itemsToAdd := []v3.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.active {
		labelsJSON, err := json.Marshal(a.QueryResultLables)
		if err != nil {
			zap.L().Error("error marshaling labels", zap.Error(err), zap.Any("labels", a.Labels))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == baserules.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > baserules.ResolvedRetention) {
				delete(r.active, fp)
			}
			if a.State != baserules.StateInactive {
				a.State = baserules.StateInactive
				a.ResolvedAt = ts
				itemsToAdd = append(itemsToAdd, v3.RuleStateHistory{
					RuleID:       r.ID(),
					RuleName:     r.Name(),
					State:        "normal",
					StateChanged: true,
					UnixMilli:    ts.UnixMilli(),
					Labels:       v3.LabelsString(labelsJSON),
					Fingerprint:  a.QueryResultLables.Hash(),
				})
			}
			continue
		}

		if a.State == baserules.StatePending && ts.Sub(a.ActiveAt) >= r.HoldDuration() {
			a.State = baserules.StateFiring
			a.FiredAt = ts
			state := "firing"
			if a.Missing {
				state = "no_data"
			}
			itemsToAdd = append(itemsToAdd, v3.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       v3.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLables.Hash(),
				Value:        a.Value,
			})
		}
	}

	currentState := r.State()

	if currentState != prevState {
		for idx := range itemsToAdd {
			if currentState == baserules.StateInactive {
				itemsToAdd[idx].OverallState = "normal"
			} else {
				itemsToAdd[idx].OverallState = currentState.String()
			}
			itemsToAdd[idx].OverallStateChanged = true
		}
	} else {
		for idx := range itemsToAdd {
			itemsToAdd[idx].OverallState = currentState.String()
			itemsToAdd[idx].OverallStateChanged = false
		}
	}

	if len(itemsToAdd) > 0 && r.reader != nil {
		err := r.reader.AddRuleStateHistory(ctx, itemsToAdd)
		if err != nil {
			zap.L().Error("error while inserting rule state history", zap.Error(err), zap.Any("itemsToAdd", itemsToAdd))
		}
	}

	return len(r.active), nil
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

// populateTemporality same as addTemporality but for v4 and better
func (r *AnomalyRule) populateTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3) error {

	missingTemporality := make([]string, 0)
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)
	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for _, query := range qp.CompositeQuery.BuilderQueries {
			// if there is no temporality specified in the query but we have it in the map
			// then use the value from the map
			if query.Temporality == "" && r.temporalityMap[query.AggregateAttribute.Key] != nil {
				// We prefer delta if it is available
				if r.temporalityMap[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if r.temporalityMap[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
			}
			// we don't have temporality for this metric
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				missingTemporality = append(missingTemporality, query.AggregateAttribute.Key)
			}
			if _, ok := metricNameToTemporality[query.AggregateAttribute.Key]; !ok {
				metricNameToTemporality[query.AggregateAttribute.Key] = make(map[v3.Temporality]bool)
			}
		}
	}

	var nameToTemporality map[string]map[v3.Temporality]bool
	var err error

	if len(missingTemporality) > 0 {
		nameToTemporality, err = r.reader.FetchTemporality(ctx, missingTemporality)
		if err != nil {
			return err
		}
	}

	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for name := range qp.CompositeQuery.BuilderQueries {
			query := qp.CompositeQuery.BuilderQueries[name]
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				if nameToTemporality[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if nameToTemporality[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
				r.temporalityMap[query.AggregateAttribute.Key] = nameToTemporality[query.AggregateAttribute.Key]
			}
		}
	}
	return nil
}
