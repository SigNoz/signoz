package rules

import (
	"context"
	"fmt"
	"math"
	"net/url"
	"sync"
	"time"

	"go.signoz.io/signoz/pkg/query-service/converter"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	qslabels "go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
)

// BaseRule contains common fields and methods for all rule types
type BaseRule struct {
	id             string
	name           string
	source         string
	handledRestart bool

	// Type of the rule
	typ AlertType

	ruleCondition *RuleCondition
	// evalWindow is the time window used for evaluating the rule
	// i.e each time we lookback from the current time, we look at data for the last
	// evalWindow duration
	evalWindow time.Duration
	// holdDuration is the duration for which the alert waits before firing
	holdDuration time.Duration

	// evalDelay is the delay in evaluation of the rule
	// this is useful in cases where the data is not available immediately
	evalDelay time.Duration

	// holds the static set of labels and annotations for the rule
	// these are the same for all alerts created for this rule
	labels      qslabels.BaseLabels
	annotations qslabels.BaseLabels
	// preferredChannels is the list of channels to send the alert to
	// if the rule is triggered
	preferredChannels []string
	mtx               sync.Mutex
	// the time it took to evaluate the rule (most recent evaluation)
	evaluationDuration time.Duration
	// the timestamp of the last evaluation
	evaluationTimestamp time.Time

	health    RuleHealth
	lastError error
	Active    map[uint64]*Alert

	// lastTimestampWithDatapoints is the timestamp of the last datapoint we observed
	// for this rule
	// this is used for missing data alerts
	lastTimestampWithDatapoints time.Time

	reader interfaces.Reader

	logger *zap.Logger

	// sendUnmatched sends observed metric values
	// even if they dont match the rule condition. this is
	// useful in testing the rule
	sendUnmatched bool

	// sendAlways will send alert irresepective of resendDelay
	// or other params
	sendAlways bool

	// TemporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	TemporalityMap map[string]map[v3.Temporality]bool
}

type RuleOption func(*BaseRule)

func WithSendAlways() RuleOption {
	return func(r *BaseRule) {
		r.sendAlways = true
	}
}

func WithSendUnmatched() RuleOption {
	return func(r *BaseRule) {
		r.sendUnmatched = true
	}
}

func WithEvalDelay(dur time.Duration) RuleOption {
	return func(r *BaseRule) {
		r.evalDelay = dur
	}
}

func WithLogger(logger *zap.Logger) RuleOption {
	return func(r *BaseRule) {
		r.logger = logger
	}
}

func NewBaseRule(id string, p *PostableRule, reader interfaces.Reader, opts ...RuleOption) (*BaseRule, error) {
	if p.RuleCondition == nil || !p.RuleCondition.IsValid() {
		return nil, fmt.Errorf("invalid rule condition")
	}

	baseRule := &BaseRule{
		id:                id,
		name:              p.AlertName,
		source:            p.Source,
		typ:               p.AlertType,
		ruleCondition:     p.RuleCondition,
		evalWindow:        time.Duration(p.EvalWindow),
		labels:            qslabels.FromMap(p.Labels),
		annotations:       qslabels.FromMap(p.Annotations),
		preferredChannels: p.PreferredChannels,
		health:            HealthUnknown,
		Active:            map[uint64]*Alert{},
		reader:            reader,
		TemporalityMap:    make(map[string]map[v3.Temporality]bool),
	}

	if baseRule.evalWindow == 0 {
		baseRule.evalWindow = 5 * time.Minute
	}

	for _, opt := range opts {
		opt(baseRule)
	}

	return baseRule, nil
}

func (r *BaseRule) targetVal() float64 {
	if r.ruleCondition == nil || r.ruleCondition.Target == nil {
		return 0
	}

	// get the converter for the target unit
	unitConverter := converter.FromUnit(converter.Unit(r.ruleCondition.TargetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(converter.Value{
		F: *r.ruleCondition.Target,
		U: converter.Unit(r.ruleCondition.TargetUnit),
	}, converter.Unit(r.Unit()))

	return value.F
}

func (r *BaseRule) matchType() MatchType {
	if r.ruleCondition == nil {
		return AtleastOnce
	}
	return r.ruleCondition.MatchType
}

func (r *BaseRule) compareOp() CompareOp {
	if r.ruleCondition == nil {
		return ValueIsEq
	}
	return r.ruleCondition.CompareOp
}

func (r *BaseRule) currentAlerts() []*Alert {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	alerts := make([]*Alert, 0, len(r.Active))
	for _, a := range r.Active {
		anew := *a
		alerts = append(alerts, &anew)
	}
	return alerts
}

func (r *BaseRule) EvalDelay() time.Duration {
	return r.evalDelay
}

func (r *BaseRule) EvalWindow() time.Duration {
	return r.evalWindow
}

func (r *BaseRule) HoldDuration() time.Duration {
	return r.holdDuration
}

func (r *BaseRule) TargetVal() float64 {
	return r.targetVal()
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

func (r *BaseRule) ID() string                       { return r.id }
func (r *BaseRule) Name() string                     { return r.name }
func (r *BaseRule) Condition() *RuleCondition        { return r.ruleCondition }
func (r *BaseRule) Labels() qslabels.BaseLabels      { return r.labels }
func (r *BaseRule) Annotations() qslabels.BaseLabels { return r.annotations }
func (r *BaseRule) PreferredChannels() []string      { return r.preferredChannels }

func (r *BaseRule) GeneratorURL() string {
	return prepareRuleGeneratorURL(r.ID(), r.source)
}

func (r *BaseRule) Unit() string {
	if r.ruleCondition != nil && r.ruleCondition.CompositeQuery != nil {
		return r.ruleCondition.CompositeQuery.Unit
	}
	return ""
}

func (r *BaseRule) Timestamps(ts time.Time) (time.Time, time.Time) {
	start := ts.Add(-time.Duration(r.evalWindow)).UnixMilli()
	end := ts.UnixMilli()

	if r.evalDelay > 0 {
		start = start - int64(r.evalDelay.Milliseconds())
		end = end - int64(r.evalDelay.Milliseconds())
	}
	// round to minute otherwise we could potentially miss data
	start = start - (start % (60 * 1000))
	end = end - (end % (60 * 1000))

	return time.UnixMilli(start), time.UnixMilli(end)
}

func (r *BaseRule) SetLastError(err error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.lastError = err
}

func (r *BaseRule) LastError() error {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.lastError
}

func (r *BaseRule) SetHealth(health RuleHealth) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.health = health
}

func (r *BaseRule) Health() RuleHealth {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.health
}

func (r *BaseRule) SetEvaluationDuration(dur time.Duration) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationDuration = dur
}

func (r *BaseRule) GetEvaluationDuration() time.Duration {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationDuration
}

func (r *BaseRule) SetEvaluationTimestamp(ts time.Time) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationTimestamp = ts
}

func (r *BaseRule) GetEvaluationTimestamp() time.Time {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationTimestamp
}

func (r *BaseRule) State() model.AlertState {
	maxState := model.StateInactive
	for _, a := range r.Active {
		if a.State > maxState {
			maxState = a.State
		}
	}
	return maxState
}

func (r *BaseRule) ActiveAlerts() []*Alert {
	var res []*Alert
	for _, a := range r.currentAlerts() {
		if a.ResolvedAt.IsZero() {
			res = append(res, a)
		}
	}
	return res
}

func (r *BaseRule) SendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	alerts := []*Alert{}
	r.ForEachActiveAlert(func(alert *Alert) {
		if alert.needsSending(ts, resendDelay) {
			alert.LastSentAt = ts
			delta := resendDelay
			if interval > resendDelay {
				delta = interval
			}
			alert.ValidUntil = ts.Add(4 * delta)
			anew := *alert
			alerts = append(alerts, &anew)
		}
	})
	notifyFunc(ctx, "", alerts...)
}

func (r *BaseRule) ForEachActiveAlert(f func(*Alert)) {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	for _, a := range r.Active {
		f(a)
	}
}

func (r *BaseRule) ShouldAlert(series v3.Series) (Sample, bool) {
	var alertSmpl Sample
	var shouldAlert bool
	var lbls qslabels.Labels

	for name, value := range series.Labels {
		lbls = append(lbls, qslabels.Label{Name: name, Value: value})
	}

	series.Points = removeGroupinSetPoints(series)

	// nothing to evaluate
	if len(series.Points) == 0 {
		return alertSmpl, false
	}

	if r.ruleCondition.RequireMinPoints {
		if len(series.Points) < r.ruleCondition.RequiredNumPoints {
			zap.L().Info("not enough data points to evaluate series, skipping", zap.String("ruleid", r.ID()), zap.Int("numPoints", len(series.Points)), zap.Int("requiredPoints", r.ruleCondition.RequiredNumPoints))
			return alertSmpl, false
		}
	}

	switch r.matchType() {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value > r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value < r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value == r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value != r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) >= r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: r.targetVal()}, Metric: lbls}
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value <= r.targetVal() {
					shouldAlert = false
					break
				}
			}
			// use min value from the series
			if shouldAlert {
				var minValue float64 = math.Inf(1)
				for _, smpl := range series.Points {
					if smpl.Value < minValue {
						minValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: minValue}, Metric: lbls}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value >= r.targetVal() {
					shouldAlert = false
					break
				}
			}
			if shouldAlert {
				var maxValue float64 = math.Inf(-1)
				for _, smpl := range series.Points {
					if smpl.Value > maxValue {
						maxValue = smpl.Value
					}
				}
				alertSmpl = Sample{Point: Point{V: maxValue}, Metric: lbls}
			}
		} else if r.compareOp() == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value != r.targetVal() {
					shouldAlert = false
					break
				}
			}
		} else if r.compareOp() == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value == r.targetVal() {
					shouldAlert = false
					break
				}
			}
			// use any non-inf or nan value from the series
			if shouldAlert {
				for _, smpl := range series.Points {
					if !math.IsInf(smpl.Value, 0) && !math.IsNaN(smpl.Value) {
						alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
						break
					}
				}
			}
		} else if r.compareOp() == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) < r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = false
					break
				}
			}
		}
	case OnAverage:
		// If the average of all samples matches the condition, the rule is firing.
		var sum, count float64
		for _, smpl := range series.Points {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
			count++
		}
		avg := sum / count
		alertSmpl = Sample{Point: Point{V: avg}, Metric: lbls}
		if r.compareOp() == ValueIsAbove {
			if avg > r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsBelow {
			if avg < r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsEq {
			if avg == r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsNotEq {
			if avg != r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueOutsideBounds {
			if math.Abs(avg) >= r.targetVal() {
				shouldAlert = true
			}
		}
	case InTotal:
		// If the sum of all samples matches the condition, the rule is firing.
		var sum float64

		for _, smpl := range series.Points {
			if math.IsNaN(smpl.Value) || math.IsInf(smpl.Value, 0) {
				continue
			}
			sum += smpl.Value
		}
		alertSmpl = Sample{Point: Point{V: sum}, Metric: lbls}
		if r.compareOp() == ValueIsAbove {
			if sum > r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsBelow {
			if sum < r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsEq {
			if sum == r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsNotEq {
			if sum != r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueOutsideBounds {
			if math.Abs(sum) >= r.targetVal() {
				shouldAlert = true
			}
		}
	case Last:
		// If the last sample matches the condition, the rule is firing.
		shouldAlert = false
		alertSmpl = Sample{Point: Point{V: series.Points[len(series.Points)-1].Value}, Metric: lbls}
		if r.compareOp() == ValueIsAbove {
			if series.Points[len(series.Points)-1].Value > r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsBelow {
			if series.Points[len(series.Points)-1].Value < r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsEq {
			if series.Points[len(series.Points)-1].Value == r.targetVal() {
				shouldAlert = true
			}
		} else if r.compareOp() == ValueIsNotEq {
			if series.Points[len(series.Points)-1].Value != r.targetVal() {
				shouldAlert = true
			}
		}
	}
	return alertSmpl, shouldAlert
}

func (r *BaseRule) RecordRuleStateHistory(ctx context.Context, prevState, currentState model.AlertState, itemsToAdd []model.RuleStateHistory) error {
	zap.L().Debug("recording rule state history", zap.String("ruleid", r.ID()), zap.Any("prevState", prevState), zap.Any("currentState", currentState), zap.Any("itemsToAdd", itemsToAdd))
	revisedItemsToAdd := map[uint64]model.RuleStateHistory{}

	lastSavedState, err := r.reader.GetLastSavedRuleStateHistory(ctx, r.ID())
	if err != nil {
		return err
	}
	// if the query-service has been restarted, or the rule has been modified (which re-initializes the rule),
	// the state would reset so we need to add the corresponding state changes to previously saved states
	if !r.handledRestart && len(lastSavedState) > 0 {
		zap.L().Debug("handling restart", zap.String("ruleid", r.ID()), zap.Any("lastSavedState", lastSavedState))
		l := map[uint64]model.RuleStateHistory{}
		for _, item := range itemsToAdd {
			l[item.Fingerprint] = item
		}

		shouldSkip := map[uint64]bool{}

		for _, item := range lastSavedState {
			// for the last saved item with fingerprint, check if there is a corresponding entry in the current state
			currentState, ok := l[item.Fingerprint]
			if !ok {
				// there was a state change in the past, but not in the current state
				// if the state was firing, then we should add a resolved state change
				if item.State == model.StateFiring || item.State == model.StateNoData {
					item.State = model.StateInactive
					item.StateChanged = true
					item.UnixMilli = time.Now().UnixMilli()
					revisedItemsToAdd[item.Fingerprint] = item
				}
				// there is nothing to do if the prev state was normal
			} else {
				if item.State != currentState.State {
					item.State = currentState.State
					item.StateChanged = true
					item.UnixMilli = time.Now().UnixMilli()
					revisedItemsToAdd[item.Fingerprint] = item
				}
			}
			// do not add this item to revisedItemsToAdd as it is already processed
			shouldSkip[item.Fingerprint] = true
		}
		zap.L().Debug("after lastSavedState loop", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		// if there are any new state changes that were not saved, add them to the revised items
		for _, item := range itemsToAdd {
			if _, ok := revisedItemsToAdd[item.Fingerprint]; !ok && !shouldSkip[item.Fingerprint] {
				revisedItemsToAdd[item.Fingerprint] = item
			}
		}
		zap.L().Debug("after itemsToAdd loop", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		newState := model.StateInactive
		for _, item := range revisedItemsToAdd {
			if item.State == model.StateFiring || item.State == model.StateNoData {
				newState = model.StateFiring
				break
			}
		}
		zap.L().Debug("newState", zap.String("ruleid", r.ID()), zap.Any("newState", newState))

		// if there is a change in the overall state, update the overall state
		if lastSavedState[0].OverallState != newState {
			for fingerprint, item := range revisedItemsToAdd {
				item.OverallState = newState
				item.OverallStateChanged = true
				revisedItemsToAdd[fingerprint] = item
			}
		}
		zap.L().Debug("revisedItemsToAdd after newState", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

	} else {
		for _, item := range itemsToAdd {
			revisedItemsToAdd[item.Fingerprint] = item
		}
	}

	if len(revisedItemsToAdd) > 0 && r.reader != nil {
		zap.L().Debug("writing rule state history", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		entries := make([]model.RuleStateHistory, 0, len(revisedItemsToAdd))
		for _, item := range revisedItemsToAdd {
			entries = append(entries, item)
		}
		err := r.reader.AddRuleStateHistory(ctx, entries)
		if err != nil {
			zap.L().Error("error while inserting rule state history", zap.Error(err), zap.Any("itemsToAdd", itemsToAdd))
		}
	}
	r.handledRestart = true

	return nil
}

func (r *BaseRule) PopulateTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3) error {

	missingTemporality := make([]string, 0)
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)
	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for _, query := range qp.CompositeQuery.BuilderQueries {
			// if there is no temporality specified in the query but we have it in the map
			// then use the value from the map
			if query.Temporality == "" && r.TemporalityMap[query.AggregateAttribute.Key] != nil {
				// We prefer delta if it is available
				if r.TemporalityMap[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if r.TemporalityMap[query.AggregateAttribute.Key][v3.Cumulative] {
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
				r.TemporalityMap[query.AggregateAttribute.Key] = nameToTemporality[query.AggregateAttribute.Key]
			}
		}
	}
	return nil
}
