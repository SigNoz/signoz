package rules

import (
	"context"
	"fmt"
	"go.uber.org/zap"
	"math"
	"net/url"
	"reflect"
	"sort"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/query-service/app/metrics"
	"go.signoz.io/query-service/constants"
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
}

func NewThresholdRule(
	id string,
	name string,
	ruleCondition *RuleCondition,
	evalWindow time.Duration,
	l, a map[string]string,
) (*ThresholdRule, error) {

	if int64(evalWindow) == 0 {
		evalWindow = 5 * time.Minute
	}

	if ruleCondition == nil {
		return nil, fmt.Errorf("no rule condition")
	} else if !ruleCondition.IsValid() {
		return nil, fmt.Errorf("invalid rule condition")
	}

	zap.S().Info("msg:", "creating new alerting rule", "\t name:", name, "\t condition:", ruleCondition.String())

	return &ThresholdRule{
		id:            id,
		name:          name,
		ruleCondition: ruleCondition,
		evalWindow:    evalWindow,
		labels:        labels.FromMap(l),
		annotations:   labels.FromMap(a),

		health: HealthUnknown,
		active: map[uint64]*Alert{},
	}, nil
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

func (r *ThresholdRule) target() *float64 {
	if r.ruleCondition == nil {
		return nil
	}
	return r.ruleCondition.Target
}

func (r *ThresholdRule) matchType() MatchType {
	if r.ruleCondition == nil {
		return AtleastOnce
	}
	return r.ruleCondition.MatchType
}

func (r *ThresholdRule) compareOp() CompareOp {
	if r.ruleCondition == nil {
		return ValueIsEq
	}
	return r.ruleCondition.CompareOp
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

func (r *ThresholdRule) SendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	zap.S().Info("msg:", "initiating send alerts (if any)", "\t rule:", r.Name())
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
		} else {
			zap.S().Debugf("msg: skipping send alert due to resend delay", "\t rule: ", r.Name(), "\t alert:", alert.Labels)
		}
	})
	notifyFunc(ctx, "", alerts...)
}
func (r *ThresholdRule) CheckCondition(v float64) bool {

	if value.IsNaN(v) {
		zap.S().Debugf("msg:", "found NaN in rule condition", "\t rule name:", r.Name())
		return false
	}

	if r.ruleCondition.Target == nil {
		zap.S().Debugf("msg:", "found null target in rule condition", "\t rulename:", r.Name())
		return false
	}

	switch r.ruleCondition.CompareOp {
	case ValueIsEq:
		return v == *r.ruleCondition.Target
	case ValueIsNotEq:
		return v != *r.ruleCondition.Target
	case ValueIsBelow:
		return v < *r.ruleCondition.Target
	case ValueIsAbove:
		return v > *r.ruleCondition.Target
	default:
		return false
	}
}

func (r *ThresholdRule) prepareQueryRange(ts time.Time) *qsmodel.QueryRangeParamsV2 {
	// todo(amol): add 30 seconds to evalWindow for rate calc
	tsEnd := ts.UnixNano() / int64(time.Millisecond)
	tsStart := ts.Add(-time.Duration(r.evalWindow)).UnixNano() / int64(time.Millisecond)

	// for k, v := range r.ruleCondition.CompositeMetricQuery.BuilderQueries {
	//	v.ReduceTo = qsmodel.RMAX
	//	r.ruleCondition.CompositeMetricQuery.BuilderQueries[k] = v
	// }

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
		zap.S().Errorf("rule:", r.Name(), "\t failed to get alert query result")
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

	// for rates we want to skip the first record
	// but we dont know when the rates are being used
	// so we always pick timeframe - 30 seconds interval
	// and skip the first record for a given label combo
	skipFirstRecord := make(map[uint64]bool, 0)

	defer rows.Close()
	for rows.Next() {

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
				if colName == "res" || colName == "value" {
					sample.Point.V = *v

				} else {
					lbls.Set(colName, fmt.Sprintf("%f", *v))
				}
			case *uint64:
				intv := *v
				if colName == "res" || colName == "value" {
					sample.Point.V = float64(intv)
				} else {
					lbls.Set(colName, fmt.Sprintf("%d", intv))
				}
			case *uint8:
				intv := *v
				if colName == "res" || colName == "value" {
					sample.Point.V = float64(intv)
				} else {
					lbls.Set(colName, fmt.Sprintf("%d", intv))
				}
			default:
				zap.S().Errorf("ruleId:", r.ID(), "\t error: invalid var found in query result", v, columnNames[i])
			}
		}

		if value.IsNaN(sample.Point.V) {
			continue
		}

		// capture lables in result
		sample.Metric = lbls.Labels()

		labelHash := lbls.Labels().Hash()

		// here we walk through values of time series
		// and calculate the final value used to compare
		// with rule target
		if existing, ok := resultMap[labelHash]; ok {

			switch r.matchType() {
			case AllTheTimes:
				if r.compareOp() == ValueIsAbove {
					sample.Point.V = math.Min(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				} else if r.compareOp() == ValueIsBelow {
					sample.Point.V = math.Max(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				}
			case AtleastOnce:
				if r.compareOp() == ValueIsAbove {
					sample.Point.V = math.Max(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				} else if r.compareOp() == ValueIsBelow {
					sample.Point.V = math.Min(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				}
			case OnAverage:
				sample.Point.V = (existing.Point.V + sample.Point.V) / 2
				resultMap[labelHash] = sample
			case InTotal:
				sample.Point.V = (existing.Point.V + sample.Point.V)
				resultMap[labelHash] = sample
			}

		} else {
			if exists, _ := skipFirstRecord[labelHash]; exists {
				resultMap[labelHash] = sample
			} else {
				// looks like the first record for this label combo, skip it
				skipFirstRecord[labelHash] = true
			}
		}
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

	runQueries := metrics.PrepareBuilderMetricQueries(params, constants.SIGNOZ_TIMESERIES_TABLENAME)
	if runQueries.Err != nil {
		return nil, fmt.Errorf("failed to prepare metric queries: %v", runQueries.Err)
	}

	if len(runQueries.Queries) == 0 {
		return nil, fmt.Errorf("no queries could be built with the rule config")
	}

	zap.S().Debugf("ruleid:", r.ID(), "\t runQueries:", runQueries.Queries)

	// find target query label
	if query, ok := runQueries.Queries["F1"]; ok {
		// found a formula query, run with it
		return r.runChQuery(ctx, ch, query)
	}

	// no formula in rule condition, now look for
	// query label with max ascii val
	keys := make([]string, 0, len(runQueries.Queries))
	for k := range runQueries.Queries {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	queryLabel := keys[len(keys)-1]

	zap.S().Debugf("ruleId: ", r.ID(), "\t result query label:", queryLabel)

	if queryString, ok := runQueries.Queries[queryLabel]; ok {
		return r.runChQuery(ctx, ch, queryString)
	}

	zap.S().Errorf("ruleId: ", r.ID(), "\t invalid query label:", queryLabel, "\t queries:", runQueries.Queries)
	return nil, fmt.Errorf("this is unexpected, invalid query label")
}

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time, queriers *Queriers, externalURL *url.URL) (interface{}, error) {

	res, err := r.buildAndRunQuery(ctx, ts, queriers.Ch)

	if err != nil {
		r.SetHealth(HealthBad)
		r.SetLastError(err)
		zap.S().Debugf("ruleid:", r.ID(), "\t failure in buildAndRunQuery:", err)
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
				zap.S().Errorf("msg:", "Expanding alert template failed", "\t err", err, "\t data", tmplData)
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
			zap.S().Errorf("ruleId: ", r.ID(), "\t msg:", "the alert query returns duplicate records:", alerts[h])
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
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

	zap.S().Info("rule:", r.Name(), "\t alerts found: ", len(alerts))

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
		EvalWindow:    Duration(r.evalWindow),
		Labels:        r.labels.Map(),
		Annotations:   r.annotations.Map(),
	}

	byt, err := yaml.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}
