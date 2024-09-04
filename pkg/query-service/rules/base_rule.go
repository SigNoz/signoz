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
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	qslabels "go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
)

// BaseRule contains common fields and methods for all rule types
type BaseRule struct {
	id     string
	name   string
	source string

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
	active    map[uint64]*Alert

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

	// withEvalDelay sets the evalDelay for the rule
	withEvalDelay time.Duration
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
		r.withEvalDelay = dur
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
		ruleCondition:     p.RuleCondition,
		evalWindow:        time.Duration(p.EvalWindow),
		labels:            qslabels.FromMap(p.Labels),
		annotations:       qslabels.FromMap(p.Annotations),
		preferredChannels: p.PreferredChannels,
		health:            HealthUnknown,
		active:            map[uint64]*Alert{},
		reader:            reader,
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

	alerts := make([]*Alert, 0, len(r.active))
	for _, a := range r.active {
		anew := *a
		alerts = append(alerts, &anew)
	}
	return alerts
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

func (r *BaseRule) State() AlertState {
	maxState := StateInactive
	for _, a := range r.active {
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

	for _, a := range r.active {
		f(a)
	}
}

func (r *BaseRule) shouldAlert(series v3.Series) (Sample, bool) {
	var alertSmpl Sample
	var shouldAlert bool
	var lbls qslabels.Labels
	var lblsNormalized qslabels.Labels

	for name, value := range series.Labels {
		lbls = append(lbls, qslabels.Label{Name: name, Value: value})
		lblsNormalized = append(lblsNormalized, qslabels.Label{Name: normalizeLabelName(name), Value: value})
	}

	series.Points = removeGroupinSetPoints(series)

	// nothing to evaluate
	if len(series.Points) == 0 {
		return alertSmpl, false
	}

	switch r.matchType() {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value > r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lblsNormalized, MetricOrig: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value < r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lblsNormalized, MetricOrig: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value == r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lblsNormalized, MetricOrig: lbls}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value != r.targetVal() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lblsNormalized, MetricOrig: lbls}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: r.targetVal()}, Metric: lblsNormalized, MetricOrig: lbls}
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value <= r.targetVal() {
					shouldAlert = false
					break
				}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value >= r.targetVal() {
					shouldAlert = false
					break
				}
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
		alertSmpl = Sample{Point: Point{V: avg}, Metric: lblsNormalized, MetricOrig: lbls}
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
		alertSmpl = Sample{Point: Point{V: sum}, Metric: lblsNormalized, MetricOrig: lbls}
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
		}
	}
	return alertSmpl, shouldAlert
}
