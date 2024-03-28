package rules

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"go.uber.org/zap"

	plabels "github.com/prometheus/prometheus/model/labels"
	pql "github.com/prometheus/prometheus/promql"
	"go.signoz.io/signoz/pkg/query-service/converter"
	"go.signoz.io/signoz/pkg/query-service/formatter"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	qslabels "go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"
	yaml "gopkg.in/yaml.v2"
)

type PromRuleOpts struct {
	// SendAlways will send alert irresepective of resendDelay
	// or other params
	SendAlways bool
}

type PromRule struct {
	id            string
	name          string
	source        string
	ruleCondition *RuleCondition

	evalWindow   time.Duration
	holdDuration time.Duration
	labels       plabels.Labels
	annotations  plabels.Labels

	preferredChannels []string

	mtx                 sync.Mutex
	evaluationDuration  time.Duration
	evaluationTimestamp time.Time

	health RuleHealth

	lastError error

	// map of active alerts
	active map[uint64]*Alert

	logger log.Logger
	opts   PromRuleOpts
}

func NewPromRule(
	id string,
	postableRule *PostableRule,
	logger log.Logger,
	opts PromRuleOpts,
) (*PromRule, error) {

	if postableRule.RuleCondition == nil {
		return nil, fmt.Errorf("no rule condition")
	} else if !postableRule.RuleCondition.IsValid() {
		return nil, fmt.Errorf("invalid rule condition")
	}

	p := PromRule{
		id:                id,
		name:              postableRule.AlertName,
		source:            postableRule.Source,
		ruleCondition:     postableRule.RuleCondition,
		evalWindow:        time.Duration(postableRule.EvalWindow),
		labels:            plabels.FromMap(postableRule.Labels),
		annotations:       plabels.FromMap(postableRule.Annotations),
		preferredChannels: postableRule.PreferredChannels,
		health:            HealthUnknown,
		active:            map[uint64]*Alert{},
		logger:            logger,
		opts:              opts,
	}

	if int64(p.evalWindow) == 0 {
		p.evalWindow = 5 * time.Minute
	}
	query, err := p.getPqlQuery()

	if err != nil {
		// can not generate a valid prom QL query
		return nil, err
	}

	zap.L().Info("creating new alerting rule", zap.String("name", p.name), zap.String("condition", p.ruleCondition.String()), zap.String("query", query))

	return &p, nil
}

func (r *PromRule) Name() string {
	return r.name
}

func (r *PromRule) ID() string {
	return r.id
}

func (r *PromRule) Condition() *RuleCondition {
	return r.ruleCondition
}

func (r *PromRule) targetVal() float64 {
	if r.ruleCondition == nil || r.ruleCondition.Target == nil {
		return 0
	}

	unitConverter := converter.FromUnit(converter.Unit(r.ruleCondition.TargetUnit))
	value := unitConverter.Convert(converter.Value{F: *r.ruleCondition.Target, U: converter.Unit(r.ruleCondition.TargetUnit)}, converter.Unit(r.Unit()))
	return value.F
}

func (r *PromRule) Type() RuleType {
	return RuleTypeProm
}

func (r *PromRule) GeneratorURL() string {
	return prepareRuleGeneratorURL(r.ID(), r.source)
}

func (r *PromRule) PreferredChannels() []string {
	return r.preferredChannels
}

func (r *PromRule) SetLastError(err error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.lastError = err
}

func (r *PromRule) LastError() error {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.lastError
}

func (r *PromRule) SetHealth(health RuleHealth) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.health = health
}

func (r *PromRule) Health() RuleHealth {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.health
}

// SetEvaluationDuration updates evaluationDuration to the duration it took to evaluate the rule on its last evaluation.
func (r *PromRule) SetEvaluationDuration(dur time.Duration) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationDuration = dur
}

func (r *PromRule) HoldDuration() time.Duration {
	return r.holdDuration
}

func (r *PromRule) EvalWindow() time.Duration {
	return r.evalWindow
}

// Labels returns the labels of the alerting rule.
func (r *PromRule) Labels() qslabels.BaseLabels {
	return r.labels
}

// Annotations returns the annotations of the alerting rule.
func (r *PromRule) Annotations() qslabels.BaseLabels {
	return r.annotations
}

// GetEvaluationDuration returns the time in seconds it took to evaluate the alerting rule.
func (r *PromRule) GetEvaluationDuration() time.Duration {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationDuration
}

// SetEvaluationTimestamp updates evaluationTimestamp to the timestamp of when the rule was last evaluated.
func (r *PromRule) SetEvaluationTimestamp(ts time.Time) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationTimestamp = ts
}

// GetEvaluationTimestamp returns the time the evaluation took place.
func (r *PromRule) GetEvaluationTimestamp() time.Time {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationTimestamp
}

// State returns the maximum state of alert instances for this rule.
// StateFiring > StatePending > StateInactive
func (r *PromRule) State() AlertState {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	maxState := StateInactive
	for _, a := range r.active {
		if a.State > maxState {
			maxState = a.State
		}
	}
	return maxState
}

func (r *PromRule) currentAlerts() []*Alert {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	alerts := make([]*Alert, 0, len(r.active))

	for _, a := range r.active {
		anew := *a
		alerts = append(alerts, &anew)
	}
	return alerts
}

func (r *PromRule) ActiveAlerts() []*Alert {
	var res []*Alert
	for _, a := range r.currentAlerts() {
		if a.ResolvedAt.IsZero() {
			res = append(res, a)
		}
	}
	return res
}

func (r *PromRule) Unit() string {
	if r.ruleCondition != nil && r.ruleCondition.CompositeQuery != nil {
		return r.ruleCondition.CompositeQuery.Unit
	}
	return ""
}

// ForEachActiveAlert runs the given function on each alert.
// This should be used when you want to use the actual alerts from the ThresholdRule
// and not on its copy.
// If you want to run on a copy of alerts then don't use this, get the alerts from 'ActiveAlerts()'.
func (r *PromRule) ForEachActiveAlert(f func(*Alert)) {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	for _, a := range r.active {
		f(a)
	}
}

func (r *PromRule) SendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	alerts := []*Alert{}
	r.ForEachActiveAlert(func(alert *Alert) {
		if r.opts.SendAlways || alert.needsSending(ts, resendDelay) {
			alert.LastSentAt = ts
			// Allow for two Eval or Alertmanager send failures.
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

func (r *PromRule) GetSelectedQuery() string {
	if r.ruleCondition != nil {
		// If the user has explicitly set the selected query, we return that.
		if r.ruleCondition.SelectedQuery != "" {
			return r.ruleCondition.SelectedQuery
		}
		// Historically, we used to have only one query in the alerts for promql.
		// So, if there is only one query, we return that.
		// This is to maintain backward compatibility.
		// For new rules, we will have to explicitly set the selected query.
		return "A"
	}
	// This should never happen.
	return ""
}

func (r *PromRule) getPqlQuery() (string, error) {

	if r.ruleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
		if len(r.ruleCondition.CompositeQuery.PromQueries) > 0 {
			selectedQuery := r.GetSelectedQuery()
			if promQuery, ok := r.ruleCondition.CompositeQuery.PromQueries[selectedQuery]; ok {
				query := promQuery.Query
				if query == "" {
					return query, fmt.Errorf("a promquery needs to be set for this rule to function")
				}
				return query, nil
			}
		}
	}

	return "", fmt.Errorf("invalid promql rule query")
}

func (r *PromRule) matchType() MatchType {
	if r.ruleCondition == nil {
		return AtleastOnce
	}
	return r.ruleCondition.MatchType
}

func (r *PromRule) compareOp() CompareOp {
	if r.ruleCondition == nil {
		return ValueIsEq
	}
	return r.ruleCondition.CompareOp
}

func (r *PromRule) Eval(ctx context.Context, ts time.Time, queriers *Queriers) (interface{}, error) {

	start := ts.Add(-r.evalWindow)
	end := ts
	interval := 60 * time.Second // TODO(srikanthccv): this should be configurable

	valueFormatter := formatter.FromUnit(r.Unit())

	q, err := r.getPqlQuery()
	if err != nil {
		return nil, err
	}
	zap.L().Info("evaluating promql query", zap.String("name", r.Name()), zap.String("query", q))
	res, err := queriers.PqlEngine.RunAlertQuery(ctx, q, start, end, interval)
	if err != nil {
		r.SetHealth(HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}

	var alerts = make(map[uint64]*Alert, len(res))

	for _, series := range res {
		l := make(map[string]string, len(series.Metric))
		for _, lbl := range series.Metric {
			l[lbl.Name] = lbl.Value
		}

		if len(series.Floats) == 0 {
			continue
		}

		alertSmpl, shouldAlert := r.shouldAlert(series)
		if !shouldAlert {
			continue
		}
		zap.L().Debug("alerting for series", zap.String("name", r.Name()), zap.Any("series", series))

		thresholdFormatter := formatter.FromUnit(r.ruleCondition.TargetUnit)
		threshold := thresholdFormatter.Format(r.targetVal(), r.ruleCondition.TargetUnit)

		tmplData := AlertTemplateData(l, valueFormatter.Format(alertSmpl.F, r.Unit()), threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

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
				level.Warn(r.logger).Log("msg", "Expanding alert template failed", "err", err, "data", tmplData)
			}
			return result
		}

		lb := plabels.NewBuilder(alertSmpl.Metric).Del(plabels.MetricName)

		for _, l := range r.labels {
			lb.Set(l.Name, expand(l.Value))
		}

		lb.Set(qslabels.AlertNameLabel, r.Name())
		lb.Set(qslabels.AlertRuleIdLabel, r.ID())
		lb.Set(qslabels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(plabels.Labels, 0, len(r.annotations))
		for _, a := range r.annotations {
			annotations = append(annotations, plabels.Label{Name: a.Name, Value: expand(a.Value)})
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			err = fmt.Errorf("vector contains metrics with the same labelset after applying alert labels")
			// We have already acquired the lock above hence using SetHealth and
			// SetLastError will deadlock.
			r.health = HealthBad
			r.lastError = err
			return nil, err
		}

		alerts[h] = &Alert{
			Labels:       lbs,
			Annotations:  annotations,
			ActiveAt:     ts,
			State:        StatePending,
			Value:        alertSmpl.F,
			GeneratorURL: r.GeneratorURL(),
			Receivers:    r.preferredChannels,
		}
	}

	zap.L().Debug("found alerts for rule", zap.Int("count", len(alerts)), zap.String("name", r.Name()))
	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.active[h]; ok && alert.State != StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			alert.Receivers = r.preferredChannels
			continue
		}

		r.active[h] = a

	}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.active {
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > resolvedRetention) {
				delete(r.active, fp)
			}
			if a.State != StateInactive {
				a.State = StateInactive
				a.ResolvedAt = ts
			}
			continue
		}

		if a.State == StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration {
			a.State = StateFiring
			a.FiredAt = ts
		}

	}
	r.health = HealthGood
	r.lastError = err

	return len(r.active), nil
}

func (r *PromRule) shouldAlert(series pql.Series) (pql.Sample, bool) {
	var alertSmpl pql.Sample
	var shouldAlert bool
	switch r.matchType() {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Floats {
				if smpl.F > r.targetVal() {
					alertSmpl = pql.Sample{F: smpl.F, T: smpl.T, Metric: series.Metric}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Floats {
				if smpl.F < r.targetVal() {
					alertSmpl = pql.Sample{F: smpl.F, T: smpl.T, Metric: series.Metric}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsEq {
			for _, smpl := range series.Floats {
				if smpl.F == r.targetVal() {
					alertSmpl = pql.Sample{F: smpl.F, T: smpl.T, Metric: series.Metric}
					shouldAlert = true
					break
				}
			}
		} else if r.compareOp() == ValueIsNotEq {
			for _, smpl := range series.Floats {
				if smpl.F != r.targetVal() {
					alertSmpl = pql.Sample{F: smpl.F, T: smpl.T, Metric: series.Metric}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = pql.Sample{F: r.targetVal(), Metric: series.Metric}
		if r.compareOp() == ValueIsAbove {
			for _, smpl := range series.Floats {
				if smpl.F <= r.targetVal() {
					shouldAlert = false
					break
				}
			}
		} else if r.compareOp() == ValueIsBelow {
			for _, smpl := range series.Floats {
				if smpl.F >= r.targetVal() {
					shouldAlert = false
					break
				}
			}
		} else if r.compareOp() == ValueIsEq {
			for _, smpl := range series.Floats {
				if smpl.F != r.targetVal() {
					shouldAlert = false
					break
				}
			}
		} else if r.compareOp() == ValueIsNotEq {
			for _, smpl := range series.Floats {
				if smpl.F == r.targetVal() {
					shouldAlert = false
					break
				}
			}
		}
	case OnAverage:
		// If the average of all samples matches the condition, the rule is firing.
		var sum float64
		for _, smpl := range series.Floats {
			if math.IsNaN(smpl.F) {
				continue
			}
			sum += smpl.F
		}
		avg := sum / float64(len(series.Floats))
		alertSmpl = pql.Sample{F: avg, Metric: series.Metric}
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
		for _, smpl := range series.Floats {
			if math.IsNaN(smpl.F) {
				continue
			}
			sum += smpl.F
		}
		alertSmpl = pql.Sample{F: sum, Metric: series.Metric}
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

func (r *PromRule) String() string {

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
