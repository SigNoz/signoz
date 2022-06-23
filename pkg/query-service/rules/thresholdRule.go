package rules

import (
	"context"
	"fmt"
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"go.uber.org/zap"
	"net/url"
	"reflect"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/query-service/app/metrics"
	qsmodel "go.signoz.io/query-service/model"
	"go.signoz.io/query-service/utils/labels"
	"go.signoz.io/query-service/utils/times"
	"go.signoz.io/query-service/utils/timestamp"
	"go.signoz.io/query-service/utils/value"

	yaml "gopkg.in/yaml.v2"
)

type ThresholdRule struct {
	id            string
	name          string
	ruleCondition *RuleCondition
	evalWindow    time.Duration
	holdDuration  time.Duration
	labels        labels.Labels
	annotations   labels.Labels

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
	id string,
	name string,
	ruleCondition *RuleCondition,
	evalWindow time.Duration,
	l, a map[string]string,
	logger log.Logger,
) *ThresholdRule {

	if int64(evalWindow) == 0 {
		evalWindow = 5 * time.Minute
	}

	// todo(amol) raise an error if target is null
	// or target compare op is null

	fmt.Println("creating new alerting rule:", name)

	return &ThresholdRule{
		id:            id,
		name:          name,
		ruleCondition: ruleCondition,
		evalWindow:    evalWindow,
		labels:        labels.FromMap(l),
		annotations:   labels.FromMap(a),

		health: HealthUnknown,
		active: map[uint64]*Alert{},
		logger: logger,
	}
}

func (r *ThresholdRule) Name() string {
	return r.name
}

func (r *ThresholdRule) ID() string {
	return r.id
}

func (r *ThresholdRule) Condition() *RuleCondition {
	return r.ruleCondition
}

func (r *ThresholdRule) Type() RuleType {
	return RuleTypeThreshold
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

func (r *ThresholdRule) EvalWindow() time.Duration {
	return r.evalWindow
}

// Labels returns the labels of the alerting rule.
func (r *ThresholdRule) Labels() labels.BaseLabels {
	return r.labels
}

// Annotations returns the annotations of the alerting rule.
func (r *ThresholdRule) Annotations() labels.BaseLabels {
	return r.annotations
}

func (r *ThresholdRule) sample(alert *Alert, ts time.Time) Sample {
	lb := labels.NewBuilder(r.labels)
	alertLabels := alert.Labels.(labels.Labels)
	for _, l := range alertLabels {
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

	alertLabels := alert.Labels.(labels.Labels)
	for _, l := range alertLabels {
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
func (r *ThresholdRule) CheckCondition(v float64) bool {
	if value.IsNaN(v) {
		zap.S().Debugf("found NaN in rule condition: ", r.Name())
		return false
	}

	switch r.ruleCondition.CompareOp {
	case TargetIsEq:
		return v == *r.ruleCondition.Target
	case TargetIsNotEq:
		return v != *r.ruleCondition.Target
	case TargetIsLess:
		return v > *r.ruleCondition.Target
	case TargetIsMore:
		return v < *r.ruleCondition.Target
	default:
		return false
	}
}

func (r *ThresholdRule) prepareQueryRange(ts time.Time) *qsmodel.QueryRangeParamsV2 {

	tsEnd := ts.UnixNano() / int64(time.Millisecond)
	tsStart := ts.Add(-time.Duration(5*time.Minute)).UnixNano() / int64(time.Millisecond)

	return &qsmodel.QueryRangeParamsV2{
		Start:                tsStart,
		End:                  tsEnd,
		Step:                 30,
		CompositeMetricQuery: r.ruleCondition.CompositeMetricQuery,
	}
}

// queryClickhouse runs actual query against clickhouse
func (r *ThresholdRule) runChQuery(ctx context.Context, db clickhouse.Conn, query string) (Vector, error) {
	rows, err := db.Query(ctx, query)
	if err != nil {
		fmt.Println("failed to get alert query result")
		return nil, err
	}

	columnTypes := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}
	columnNames := rows.Columns()
	if err != nil {
		return nil, err
	}
	vars := make([]interface{}, len(columnTypes))

	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}

	// []sample list
	var result Vector

	// map[fingerprint]sample
	resultMap := make(map[uint64]Sample, 0)

	defer rows.Close()
	for rows.Next() {
		// fmt.Println("first row:")
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}

		sample := Sample{}
		lbls := labels.NewBuilder(labels.Labels{})

		for i, v := range vars {
			colName := columnNames[i]
			switch v := v.(type) {
			case *string:
				lbls.Set(colName, *v)
			case *time.Time:
				timval := *v

				if colName == "ts" {
					sample.Point.T = timval.Unix()
				} else {
					lbls.Set(colName, timval.Format("2006-01-02 15:04:05"))
				}

			case *float64:
				if colName == "res" {
					sample.Point.V = *v
				} else {
					lbls.Set(colName, fmt.Sprintf("%f", *v))
				}
			case *uint64:
				intv := *v
				if colName == "res" {
					sample.Point.V = float64(intv)
				} else {
					lbls.Set(colName, fmt.Sprintf("%d", intv))
				}
			case *uint8:
				intv := *v
				if colName == "res" {
					sample.Point.V = float64(intv)
				} else {
					lbls.Set(colName, fmt.Sprintf("%d", intv))
				}
			default:
				// todo(amol): log  error
				fmt.Println("var", v, columnNames[i])
			}
		}

		// capture lables in result
		sample.Metric = lbls.Labels()
		// assumption here: the ch query will always order
		// the data by timestamp, here we pick the last record
		// to send as result to alert
		resultMap[lbls.Labels().Hash()] = sample
	}

	for _, sample := range resultMap {
		// check alert rule condition before dumping results
		if r.CheckCondition(sample.Point.V) {
			result = append(result, sample)
		}
	}

	return result, nil
}

// query looks if alert condition is being
// satisfied and returns the signals
func (r *ThresholdRule) buildAndRunQuery(ctx context.Context, ts time.Time, ch clickhouse.Conn) (Vector, error) {
	params := r.prepareQueryRange(ts)
	fmt.Println("params: ", params)
	runQueries := metrics.PrepareBuilderMetricQueries(params, "time_series")
	if runQueries.Err != nil {
		return nil, fmt.Errorf("failed to build alert query: %v", runQueries.Err)
	}

	if len(runQueries.Queries) == 0 {
		return nil, fmt.Errorf("failed to build query")
	}

	// pick the last query as that will lead to the final result
	// todo(amol): need to find a way to get final result

	if queryString, ok := runQueries.Queries["C"]; ok {
		return r.runChQuery(ctx, ch, queryString)
	}

	if queryString, ok := runQueries.Queries["B"]; ok {
		return r.runChQuery(ctx, ch, queryString)
	}

	if queryString, ok := runQueries.Queries["A"]; ok {
		return r.runChQuery(ctx, ch, queryString)
	}

	return nil, fmt.Errorf("this is unexpected, more than 3 queries in the setup")
}

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time, queriers *Queriers, externalURL *url.URL) (interface{}, error) {

	res, err := r.buildAndRunQuery(ctx, ts, queriers.Ch)

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

	fmt.Println("alerts: ", alerts)
	fmt.Println("alerts: ", len(alerts))

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

	ar := PostableRule{
		Alert:         r.name,
		RuleCondition: r.ruleCondition,
		EvalWindow:    time.Duration(r.evalWindow),
		Labels:        r.labels.Map(),
		Annotations:   r.annotations.Map(),
	}

	byt, err := yaml.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}
