package rules

import (
	"context"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"

	"github.com/pkg/errors"
	qsmodel "go.signoz.io/query-service/model"
	"go.signoz.io/query-service/utils/labels"
	"go.signoz.io/query-service/utils/times"
	"go.signoz.io/query-service/utils/timestamp"
	yaml "gopkg.in/yaml.v2"
)

const (
	// AlertMetricName is the metric name for synthetic alert timeseries.
	alertMetricName = "ALERTS"

	// AlertForStateMetricName is the metric name for 'for' state of alert.
	alertForStateMetricName = "ALERTS_FOR_STATE"

	// todo(amol)
	// AlertNameLabel is the label name indicating the name of an alert.
	// alertNameLabel = "alertname"

	// AlertStateLabel is the label name indicating the state of an alert.
	alertStateLabel = "alertstate"
)

type RuleHealth string

const (
	HealthUnknown RuleHealth = "unknown"
	HealthGood    RuleHealth = "ok"
	HealthBad     RuleHealth = "err"
)

// AlertState denotes the state of an active alert.
type AlertState int

const (
	StateInactive AlertState = iota
	StatePending
	StateFiring
)

func (s AlertState) String() string {
	switch s {
	case StateInactive:
		return "inactive"
	case StatePending:
		return "pending"
	case StateFiring:
		return "firing"
	}
	panic(errors.Errorf("unknown alert state: %d", s))
}

type Alert struct {
	State AlertState

	Labels      labels.Labels
	Annotations labels.Labels

	Value      float64
	ActiveAt   time.Time
	FiredAt    time.Time
	ResolvedAt time.Time
	LastSentAt time.Time
	ValidUntil time.Time
}

// todo(amol): need to review this
func (a *Alert) needsSending(ts time.Time, resendDelay time.Duration) bool {
	if a.State == StatePending {
		return false
	}

	// if an alert has been resolved since the last send, resend it
	if a.ResolvedAt.After(a.LastSentAt) {
		return true
	}
	fmt.Println("resendDelay", resendDelay)
	return a.LastSentAt.Add(resendDelay).Before(ts)
}

type QueryBuilder struct {
	CompositeMetricQuery *qsmodel.CompositeMetricQuery `json:"compositeMetricQuery,omitempty" yaml:"compositeMetricQuery,omitempty"`
}

type ThresholdRule struct {
	name         string
	queryBuilder *QueryBuilder

	holdDuration time.Duration
	labels       labels.Labels
	annotations  labels.Labels

	mtx                 sync.Mutex
	evaluationDuration  time.Duration
	evaluationTimestamp time.Time

	health RuleHealth

	lastError error

	// map of active alerts
	active map[uint64]*Alert

	logger log.Logger
}

func NewThresholdRule(
	name string,
	queryBuilder *QueryBuilder,
	hold time.Duration,
	labels, annotations labels.Labels,
	logger log.Logger,
) *ThresholdRule {
	if queryBuilder == nil || queryBuilder.CompositeMetricQuery == nil {

		queryBuilder = &QueryBuilder{
			CompositeMetricQuery: &qsmodel.CompositeMetricQuery{
				RawQuery: `SELECT '3dwe3e324' fingerprint, 1651387726874 ts, 12.12 res FROM system.one`,
				BuildMetricQueries: []*qsmodel.MetricQuery{
					{
						MetricName:        "signoz_latency_count",
						AggregateOperator: "rate",
					},
				},
			},
		}
	}

	if int64(evalWindow) == 0 {
		evalWindow = 5 * time.Minute
	}

	fmt.Println("creating new alerting rule:", name)

	return &ThresholdRule{
		name:         name,
		queryBuilder: queryBuilder,
		holdDuration: hold,
		labels:       labels,
		annotations:  annotations,
		health:       HealthUnknown,
		active:       map[uint64]*Alert{},
		logger:       logger,
	}
}

func (r *ThresholdRule) Name() string {
	return r.name
}

func (r *ThresholdRule) SetLastError(err error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.lastError = err
}

func (r *ThresholdRule) LastError() error {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.lastError
}

func (r *ThresholdRule) SetHealth(health RuleHealth) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.health = health
}

func (r *ThresholdRule) Health() RuleHealth {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.health
}

// SetEvaluationDuration updates evaluationDuration to the duration it took to evaluate the rule on its last evaluation.
func (r *ThresholdRule) SetEvaluationDuration(dur time.Duration) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationDuration = dur
}

func (r *ThresholdRule) HoldDuration() time.Duration {
	return r.holdDuration
}

// Labels returns the labels of the alerting rule.
func (r *ThresholdRule) Labels() labels.Labels {
	return r.labels
}

// Annotations returns the annotations of the alerting rule.
func (r *ThresholdRule) Annotations() labels.Labels {
	return r.annotations
}

func (r *ThresholdRule) sample(alert *Alert, ts time.Time) Sample {
	lb := labels.NewBuilder(r.labels)

	for _, l := range alert.Labels {
		lb.Set(l.Name, l.Value)
	}

	lb.Set(labels.MetricName, alertMetricName)
	lb.Set(labels.AlertName, r.name)
	lb.Set(alertStateLabel, alert.State.String())

	s := Sample{
		Metric: lb.Labels(),
		Point:  Point{T: timestamp.FromTime(ts), V: 1},
	}
	return s
}

// forStateSample returns the sample for ALERTS_FOR_STATE.
func (r *ThresholdRule) forStateSample(alert *Alert, ts time.Time, v float64) Sample {
	lb := labels.NewBuilder(r.labels)

	for _, l := range alert.Labels {
		lb.Set(l.Name, l.Value)
	}

	lb.Set(labels.MetricName, alertForStateMetricName)
	lb.Set(labels.AlertName, r.name)

	s := Sample{
		Metric: lb.Labels(),
		Point:  Point{T: timestamp.FromTime(ts), V: v},
	}
	return s
}

// GetEvaluationDuration returns the time in seconds it took to evaluate the alerting rule.
func (r *ThresholdRule) GetEvaluationDuration() time.Duration {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationDuration
}

// SetEvaluationTimestamp updates evaluationTimestamp to the timestamp of when the rule was last evaluated.
func (r *ThresholdRule) SetEvaluationTimestamp(ts time.Time) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationTimestamp = ts
}

// GetEvaluationTimestamp returns the time the evaluation took place.
func (r *ThresholdRule) GetEvaluationTimestamp() time.Time {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationTimestamp
}

const resolvedRetention = 15 * time.Minute

// State returns the maximum state of alert instances for this rule.
// StateFiring > StatePending > StateInactive
func (r *ThresholdRule) State() AlertState {
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

func (r *ThresholdRule) currentAlerts() []*Alert {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	alerts := make([]*Alert, 0, len(r.active))

	for _, a := range r.active {
		anew := *a
		alerts = append(alerts, &anew)
	}
	return alerts
}

func (r *ThresholdRule) ActiveAlerts() []*Alert {
	var res []*Alert
	for _, a := range r.currentAlerts() {
		if a.ResolvedAt.IsZero() {
			res = append(res, a)
		}
	}
	return res
}

// ForEachActiveAlert runs the given function on each alert.
// This should be used when you want to use the actual alerts from the ThresholdRule
// and not on its copy.
// If you want to run on a copy of alerts then don't use this, get the alerts from 'ActiveAlerts()'.
func (r *ThresholdRule) ForEachActiveAlert(f func(*Alert)) {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	for _, a := range r.active {
		f(a)
	}
}

func (r *ThresholdRule) sendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	alerts := []*Alert{}
	r.ForEachActiveAlert(func(alert *Alert) {
		if alert.needsSending(ts, resendDelay) {
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

func (r *ThresholdRule) prepareQueryRange(ts time.Time) *qsmodel.QueryRangeParamsV2 {

	timestamp := ts.UnixNano() / int64(time.Millisecond)

	return &qsmodel.QueryRangeParamsV2{
		Start:                timestamp,
		End:                  timestamp,
		Step:                 "1 HOUR",
		CompositeMetricQuery: r.queryBuilder.CompositeMetricQuery,
	}
}

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time, queriers *Queriers, externalURL *url.URL) (Vector, error) {
	// check which evaluator to use and go for it

	// todo(amol): get the name of table in build query
	buildQueries, err := r.prepareQueryRange(ts).BuildQuery("time_series")
	fmt.Println("queries:", buildQueries)
	if len(buildQueries) == 0 {
		// todo(amol): add log
		return nil, fmt.Errorf(fmt.Sprintf("failed to build query for rule %s", r.name))
	}

	res, err := query(ctx, buildQueries[len(buildQueries)-1], ts)
	if err != nil {
		r.SetHealth(HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var vec Vector
	var alerts = make(map[uint64]*Alert, len(res))

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		tmplData := AlertTemplateData(l, smpl.V)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}"

		expand := func(text string) string {

			tmpl := NewTemplateExpander(
				ctx,
				defs+text,
				"__alert_"+r.Name(),
				tmplData,
				times.Time(timestamp.FromTime(ts)),
				QueryFunc(query),
				externalURL,
			)
			result, err := tmpl.Expand()
			if err != nil {
				result = fmt.Sprintf("<error expanding template: %s>", err)
				level.Warn(r.logger).Log("msg", "Expanding alert template failed", "err", err, "data", tmplData)
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(labels.MetricName)

		for _, l := range r.labels {
			lb.Set(l.Name, expand(l.Value))
		}
		lb.Set(labels.AlertName, r.Name())

		annotations := make(labels.Labels, 0, len(r.annotations))
		for _, a := range r.annotations {
			annotations = append(annotations, labels.Label{Name: a.Name, Value: expand(a.Value)})
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
			Labels:      lbs,
			Annotations: annotations,
			ActiveAt:    ts,
			State:       StatePending,
			Value:       smpl.V,
		}
	}

	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.active[h]; ok && alert.State != StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
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
	return vec, nil

}

func (r *ThresholdRule) String() string {
	var qb QueryBuilder
	if r.queryBuilder == nil {
		qb = QueryBuilder{}
	} else {
		qb = *r.queryBuilder
	}
	ar := PostableRule{
		Alert:        r.name,
		QueryBuilder: qb,
		For:          time.Duration(r.holdDuration),
		Labels:       r.labels.Map(),
		Annotations:  r.annotations.Map(),
	}

	byt, err := yaml.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}
