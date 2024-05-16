package rules

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"reflect"
	"regexp"
	"sort"
	"sync"
	"text/template"
	"time"
	"unicode"

	"go.uber.org/zap"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/converter"

	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"

	logsv3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	metricsV4 "go.signoz.io/signoz/pkg/query-service/app/metrics/v4"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/formatter"

	yaml "gopkg.in/yaml.v2"
)

type ThresholdRule struct {
	id            string
	name          string
	source        string
	ruleCondition *RuleCondition
	evalWindow    time.Duration
	holdDuration  time.Duration
	labels        labels.Labels
	annotations   labels.Labels

	preferredChannels   []string
	mtx                 sync.Mutex
	evaluationDuration  time.Duration
	evaluationTimestamp time.Time

	health RuleHealth

	lastError error

	// map of active alerts
	active map[uint64]*Alert

	queryBuilder   *queryBuilder.QueryBuilder
	version        string
	queryBuilderV4 *queryBuilder.QueryBuilder
	// temporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	temporalityMap map[string]map[v3.Temporality]bool

	opts ThresholdRuleOpts

	lastTimestampWithDatapoints time.Time
	typ                         string
}

type ThresholdRuleOpts struct {
	// sendUnmatched sends observed metric values
	// even if they dont match the rule condition. this is
	// useful in testing the rule
	SendUnmatched bool

	// sendAlways will send alert irresepective of resendDelay
	// or other params
	SendAlways bool
}

func NewThresholdRule(
	id string,
	p *PostableRule,
	opts ThresholdRuleOpts,
	featureFlags interfaces.FeatureLookup,
) (*ThresholdRule, error) {

	if p.RuleCondition == nil {
		return nil, fmt.Errorf("no rule condition")
	} else if !p.RuleCondition.IsValid() {
		return nil, fmt.Errorf("invalid rule condition")
	}

	t := ThresholdRule{
		id:                id,
		name:              p.AlertName,
		source:            p.Source,
		ruleCondition:     p.RuleCondition,
		evalWindow:        time.Duration(p.EvalWindow),
		labels:            labels.FromMap(p.Labels),
		annotations:       labels.FromMap(p.Annotations),
		preferredChannels: p.PreferredChannels,
		health:            HealthUnknown,
		active:            map[uint64]*Alert{},
		opts:              opts,
		typ:               p.AlertType,
		version:           p.Version,
		temporalityMap:    make(map[string]map[v3.Temporality]bool),
	}

	if int64(t.evalWindow) == 0 {
		t.evalWindow = 5 * time.Minute
	}

	builderOpts := queryBuilder.QueryBuilderOptions{
		BuildMetricQuery: metricsv3.PrepareMetricQuery,
		BuildTraceQuery:  tracesV3.PrepareTracesQuery,
		BuildLogQuery:    logsv3.PrepareLogsQuery,
	}
	t.queryBuilder = queryBuilder.NewQueryBuilder(builderOpts, featureFlags)

	builderOptsV4 := queryBuilder.QueryBuilderOptions{
		BuildMetricQuery: metricsV4.PrepareMetricQuery,
		BuildTraceQuery:  tracesV3.PrepareTracesQuery,
		BuildLogQuery:    logsv3.PrepareLogsQuery,
	}
	t.queryBuilderV4 = queryBuilder.NewQueryBuilder(builderOptsV4, featureFlags)

	zap.L().Info("creating new ThresholdRule", zap.String("name", t.name), zap.String("id", t.id))

	return &t, nil
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

func (r *ThresholdRule) GeneratorURL() string {
	return prepareRuleGeneratorURL(r.ID(), r.source)
}

func (r *ThresholdRule) PreferredChannels() []string {
	return r.preferredChannels
}

func (r *ThresholdRule) targetVal() float64 {
	if r.ruleCondition == nil || r.ruleCondition.Target == nil {
		return 0
	}

	return *r.ruleCondition.Target
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

func (r *ThresholdRule) FetchTemporality(ctx context.Context, metricNames []string, ch driver.Conn) (map[string]map[v3.Temporality]bool, error) {

	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)

	query := fmt.Sprintf(`SELECT DISTINCT metric_name, temporality FROM %s.%s WHERE metric_name IN $1`, constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME)

	rows, err := ch.Query(ctx, query, metricNames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var metricName, temporality string
		err := rows.Scan(&metricName, &temporality)
		if err != nil {
			return nil, err
		}
		if _, ok := metricNameToTemporality[metricName]; !ok {
			metricNameToTemporality[metricName] = make(map[v3.Temporality]bool)
		}
		metricNameToTemporality[metricName][v3.Temporality(temporality)] = true
	}
	return metricNameToTemporality, nil
}

// populateTemporality same as addTemporality but for v4 and better
func (r *ThresholdRule) populateTemporality(ctx context.Context, qp *v3.QueryRangeParamsV3, ch driver.Conn) error {

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

	nameToTemporality, err := r.FetchTemporality(ctx, missingTemporality, ch)
	if err != nil {
		return err
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
	zap.L().Info("sending alerts", zap.String("rule", r.Name()))
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
		} else {
			zap.L().Debug("skipping send alert due to resend delay", zap.String("rule", r.Name()), zap.Any("alert", alert.Labels))
		}
	})
	notifyFunc(ctx, "", alerts...)
}

func (r *ThresholdRule) Unit() string {
	if r.ruleCondition != nil && r.ruleCondition.CompositeQuery != nil {
		return r.ruleCondition.CompositeQuery.Unit
	}
	return ""
}

func (r *ThresholdRule) CheckCondition(v float64) bool {

	if math.IsNaN(v) {
		zap.L().Debug("found NaN in rule condition", zap.String("rule", r.Name()))
		return false
	}

	if r.ruleCondition.Target == nil {
		zap.L().Debug("found null target in rule condition", zap.String("rule", r.Name()))
		return false
	}

	unitConverter := converter.FromUnit(converter.Unit(r.ruleCondition.TargetUnit))

	value := unitConverter.Convert(converter.Value{F: *r.ruleCondition.Target, U: converter.Unit(r.ruleCondition.TargetUnit)}, converter.Unit(r.Unit()))

	zap.L().Info("Checking condition for rule", zap.String("rule", r.Name()), zap.String("converter", unitConverter.Name()), zap.Float64("value", v), zap.Float64("target", value.F), zap.String("compareOp", string(r.ruleCondition.CompareOp)))
	switch r.ruleCondition.CompareOp {
	case ValueIsEq:
		return v == value.F
	case ValueIsNotEq:
		return v != value.F
	case ValueIsBelow:
		return v < value.F
	case ValueIsAbove:
		return v > value.F
	default:
		return false
	}
}

func (r *ThresholdRule) prepareQueryRange(ts time.Time) *v3.QueryRangeParamsV3 {
	// todo(amol): add 30 seconds to evalWindow for rate calc

	// todo(srikanthccv): make this configurable
	// 2 minutes is reasonable time to wait for data to be available
	// 60 seconds (SDK) + 10 seconds (batch) + rest for n/w + serialization + write to disk etc..
	start := ts.Add(-time.Duration(r.evalWindow)).UnixMilli() - 2*60*1000
	end := ts.UnixMilli() - 2*60*1000

	// round to minute otherwise we could potentially miss data
	start = start - (start % (60 * 1000))
	end = end - (end % (60 * 1000))

	if r.ruleCondition.QueryType() == v3.QueryTypeClickHouseSQL {
		return &v3.QueryRangeParamsV3{
			Start:          start,
			End:            end,
			Step:           60,
			CompositeQuery: r.ruleCondition.CompositeQuery,
			Variables:      make(map[string]interface{}, 0),
		}
	}

	if r.ruleCondition.CompositeQuery != nil && r.ruleCondition.CompositeQuery.BuilderQueries != nil {
		for _, q := range r.ruleCondition.CompositeQuery.BuilderQueries {
			q.StepInterval = int64(math.Max(float64(common.MinAllowedStepInterval(start, end)), 60))
		}
	}

	// default mode
	return &v3.QueryRangeParamsV3{
		Start:          start,
		End:            end,
		Step:           60,
		CompositeQuery: r.ruleCondition.CompositeQuery,
	}
}

func (r *ThresholdRule) shouldSkipFirstRecord() bool {
	shouldSkip := false
	for _, q := range r.ruleCondition.CompositeQuery.BuilderQueries {
		if q.DataSource == v3.DataSourceMetrics && q.AggregateOperator.IsRateOperator() {
			shouldSkip = true
		}
	}
	return shouldSkip
}

// queryClickhouse runs actual query against clickhouse
func (r *ThresholdRule) runChQuery(ctx context.Context, db clickhouse.Conn, query string) (Vector, error) {
	rows, err := db.Query(ctx, query)
	if err != nil {
		zap.L().Error("failed to get alert query result", zap.String("rule", r.Name()), zap.Error(err))
		return nil, err
	}

	columnTypes := rows.ColumnTypes()
	columnNames := rows.Columns()
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
	// NOTE: this is not applicable for raw queries
	skipFirstRecord := make(map[uint64]bool, 0)

	defer rows.Close()
	for rows.Next() {

		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		r.lastTimestampWithDatapoints = time.Now()

		sample := Sample{}
		// Why do we maintain two labels sets? Alertmanager requires
		// label keys to follow the model https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
		// However, our traces and logs explorers support label keys with dot and other namespace characters
		// Using normalized label keys results in invalid filter criteria.
		// The original labels are used to prepare the related{logs, traces} link in alert notification
		lbls := labels.NewBuilder(labels.Labels{})
		lblsOrig := labels.NewBuilder(labels.Labels{})

		for i, v := range vars {

			colName := normalizeLabelName(columnNames[i])

			switch v := v.(type) {
			case *string:
				lbls.Set(colName, *v)
				lblsOrig.Set(columnNames[i], *v)
			case *time.Time:
				timval := *v

				if colName == "ts" || colName == "interval" {
					sample.Point.T = timval.Unix()
				} else {
					lbls.Set(colName, timval.Format(constants.AlertTimeFormat))
					lblsOrig.Set(columnNames[i], timval.Format(constants.AlertTimeFormat))
				}

			case *float64:
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok {
					sample.Point.V = *v
				} else {
					lbls.Set(colName, fmt.Sprintf("%f", *v))
					lblsOrig.Set(columnNames[i], fmt.Sprintf("%f", *v))
				}
			case **float64:
				// ch seems to return this type when column is derived from
				// SELECT count(*)/ SELECT count(*)
				floatVal := *v
				if floatVal != nil {
					if _, ok := constants.ReservedColumnTargetAliases[colName]; ok {
						sample.Point.V = *floatVal
					} else {
						lbls.Set(colName, fmt.Sprintf("%f", *floatVal))
						lblsOrig.Set(columnNames[i], fmt.Sprintf("%f", *floatVal))
					}
				}
			case *float32:
				float32Val := float32(*v)
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok {
					sample.Point.V = float64(float32Val)
				} else {
					lbls.Set(colName, fmt.Sprintf("%f", float32Val))
					lblsOrig.Set(columnNames[i], fmt.Sprintf("%f", float32Val))
				}
			case *uint8, *uint64, *uint16, *uint32:
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok {
					sample.Point.V = float64(reflect.ValueOf(v).Elem().Uint())
				} else {
					lbls.Set(colName, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint()))
					lblsOrig.Set(columnNames[i], fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint()))
				}
			case *int8, *int16, *int32, *int64:
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok {
					sample.Point.V = float64(reflect.ValueOf(v).Elem().Int())
				} else {
					lbls.Set(colName, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int()))
					lblsOrig.Set(columnNames[i], fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int()))
				}
			default:
				zap.L().Error("invalid var found in query result", zap.String("ruleId", r.ID()), zap.Any("value", v), zap.Any("column", columnNames[i]))
			}
		}

		if math.IsNaN(sample.Point.V) {
			continue
		}
		sample.Point.Vs = append(sample.Point.Vs, sample.Point.V)

		// capture lables in result
		sample.Metric = lbls.Labels()
		sample.MetricOrig = lblsOrig.Labels()

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
				} else {
					sample.Point.Vs = append(existing.Point.Vs, sample.Point.V)
					resultMap[labelHash] = sample
				}
			case AtleastOnce:
				if r.compareOp() == ValueIsAbove {
					sample.Point.V = math.Max(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				} else if r.compareOp() == ValueIsBelow {
					sample.Point.V = math.Min(existing.Point.V, sample.Point.V)
					resultMap[labelHash] = sample
				} else {
					sample.Point.Vs = append(existing.Point.Vs, sample.Point.V)
					resultMap[labelHash] = sample
				}
			case OnAverage:
				sample.Point.Vs = append(existing.Point.Vs, sample.Point.V)
				sample.Point.V = (existing.Point.V + sample.Point.V)
				resultMap[labelHash] = sample
			case InTotal:
				sample.Point.V = (existing.Point.V + sample.Point.V)
				resultMap[labelHash] = sample
			}

		} else {
			if r.Condition().QueryType() == v3.QueryTypeBuilder {
				// for query builder, time series data
				// we skip the first record to support rate cases correctly
				// improvement(amol): explore approaches to limit this only for
				// rate uses cases
				if exists := skipFirstRecord[labelHash]; exists || !r.shouldSkipFirstRecord() {
					resultMap[labelHash] = sample
				} else {
					// looks like the first record for this label combo, skip it
					skipFirstRecord[labelHash] = true
				}
			} else {
				// for clickhouse raw queries, all records are considered
				// improvement(amol): think about supporting rate queries
				// written by user. may have to skip a record, similar to qb case(above)
				resultMap[labelHash] = sample
			}

		}

	}

	if r.matchType() == OnAverage {
		for hash, s := range resultMap {
			s.Point.V = s.Point.V / float64(len(s.Point.Vs))
			resultMap[hash] = s
		}
	}

	for hash, s := range resultMap {
		if r.matchType() == AllTheTimes && r.compareOp() == ValueIsEq {
			for _, v := range s.Point.Vs {
				if v != r.targetVal() { // if any of the values is not equal to target, alert shouldn't be sent
					s.Point.V = v
				}
			}
			resultMap[hash] = s
		} else if r.matchType() == AllTheTimes && r.compareOp() == ValueIsNotEq {
			for _, v := range s.Point.Vs {
				if v == r.targetVal() { // if any of the values is equal to target, alert shouldn't be sent
					s.Point.V = v
				}
			}
			resultMap[hash] = s
		} else if r.matchType() == AtleastOnce && r.compareOp() == ValueIsEq {
			for _, v := range s.Point.Vs {
				if v == r.targetVal() { // if any of the values is equal to target, alert should be sent
					s.Point.V = v
				}
			}
			resultMap[hash] = s
		} else if r.matchType() == AtleastOnce && r.compareOp() == ValueIsNotEq {
			for _, v := range s.Point.Vs {
				if v != r.targetVal() { // if any of the values is not equal to target, alert should be sent
					s.Point.V = v
				}
			}
			resultMap[hash] = s
		}
	}

	zap.L().Debug("resultmap(potential alerts)", zap.String("ruleid", r.ID()), zap.Int("count", len(resultMap)))

	// if the data is missing for `For` duration then we should send alert
	if r.ruleCondition.AlertOnAbsent && r.lastTimestampWithDatapoints.Add(time.Duration(r.Condition().AbsentFor)*time.Minute).Before(time.Now()) {
		zap.L().Info("no data found for rule condition", zap.String("ruleid", r.ID()))
		lbls := labels.NewBuilder(labels.Labels{})
		if !r.lastTimestampWithDatapoints.IsZero() {
			lbls.Set("lastSeen", r.lastTimestampWithDatapoints.Format(constants.AlertTimeFormat))
		}
		result = append(result, Sample{
			Metric:    lbls.Labels(),
			IsMissing: true,
		})
		return result, nil
	}

	for _, sample := range resultMap {
		// check alert rule condition before dumping results, if sendUnmatchedResults
		// is set then add results irrespective of condition
		if r.opts.SendUnmatched || r.CheckCondition(sample.Point.V) {
			result = append(result, sample)
		}
	}
	if len(result) != 0 {
		zap.L().Info("found alerts", zap.String("ruleid", r.ID()), zap.String("query", query), zap.Int("count", len(result)))
	}
	return result, nil
}

func (r *ThresholdRule) prepareBuilderQueries(ts time.Time, ch driver.Conn) (map[string]string, error) {
	params := r.prepareQueryRange(ts)
	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		// check if any enrichment is required for logs if yes then enrich them
		if logsv3.EnrichmentRequired(params) {
			// Note: Sending empty fields key because enrichment is only needed for json
			// TODO: Add support for attribute enrichment later
			logsv3.Enrich(params, map[string]v3.AttributeKey{})
		}

	}

	var runQueries map[string]string
	var err error

	if r.version == "v4" {
		if ch != nil {
			r.populateTemporality(context.Background(), params, ch)
		}
		runQueries, err = r.queryBuilderV4.PrepareQueries(params)
	} else {
		runQueries, err = r.queryBuilder.PrepareQueries(params)
	}

	return runQueries, err
}

// The following function is used to prepare the where clause for the query
// `lbls` contains the key value pairs of the labels from the result of the query
// We iterate over the where clause and replace the labels with the actual values
// There are two cases:
// 1. The label is present in the where clause
// 2. The label is not present in the where clause
//
// Example for case 2:
// Latency by serviceName without any filter
// In this case, for each service with latency > threshold we send a notification
// The expectation will be that clicking on the related traces for service A, will
// take us to the traces page with the filter serviceName=A
// So for all the missing labels in the where clause, we add them as key = value
//
// Example for case 1:
// Severity text IN (WARN, ERROR)
// In this case, the Severity text will appear in the `lbls` if it were part of the group
// by clause, in which case we replace it with the actual value for the notification
// i.e Severity text = WARN
// If the Severity text is not part of the group by clause, then we add it as it is
func (r *ThresholdRule) fetchFilters(selectedQuery string, lbls labels.Labels) []v3.FilterItem {
	var filterItems []v3.FilterItem

	added := make(map[string]struct{})

	if r.ruleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder &&
		r.ruleCondition.CompositeQuery.BuilderQueries[selectedQuery] != nil &&
		r.ruleCondition.CompositeQuery.BuilderQueries[selectedQuery].Filters != nil {

		for _, item := range r.ruleCondition.CompositeQuery.BuilderQueries[selectedQuery].Filters.Items {
			exists := false
			for _, label := range lbls {
				if item.Key.Key == label.Name {
					// if the label is present in the where clause, replace it with key = value
					filterItems = append(filterItems, v3.FilterItem{
						Key:      item.Key,
						Operator: v3.FilterOperatorEqual,
						Value:    label.Value,
					})
					exists = true
					added[label.Name] = struct{}{}
					break
				}
			}

			if !exists {
				// if the label is not present in the where clause, add it as it is
				filterItems = append(filterItems, item)
			}
		}
	}

	// add the labels which are not present in the where clause
	for _, label := range lbls {
		if _, ok := added[label.Name]; !ok {
			filterItems = append(filterItems, v3.FilterItem{
				Key:      v3.AttributeKey{Key: label.Name},
				Operator: v3.FilterOperatorEqual,
				Value:    label.Value,
			})
		}
	}

	return filterItems
}

func (r *ThresholdRule) prepareLinksToLogs(ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	q := r.prepareQueryRange(ts)
	// Logs list view expects time in milliseconds
	tr := timeRange{
		Start:    q.Start,
		End:      q.End,
		PageSize: 100,
	}

	options := Options{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: []v3.AttributeKey{},
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	filterItems := r.fetchFilters(selectedQuery, lbls)
	urlData := urlShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: builderQuery{
			QueryData: []v3.BuilderQuery{
				{
					DataSource:         v3.DataSourceLogs,
					QueryName:          "A",
					AggregateOperator:  v3.AggregateOperatorNoOp,
					AggregateAttribute: v3.AttributeKey{},
					Filters: &v3.FilterSet{
						Items:    filterItems,
						Operator: "AND",
					},
					Expression:   "A",
					Disabled:     false,
					Having:       []v3.Having{},
					StepInterval: 60,
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "desc",
						},
					},
				},
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(string(data))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
}

func (r *ThresholdRule) prepareLinksToTraces(ts time.Time, lbls labels.Labels) string {
	selectedQuery := r.GetSelectedQuery()

	// TODO(srikanthccv): handle formula queries
	if selectedQuery < "A" || selectedQuery > "Z" {
		return ""
	}

	q := r.prepareQueryRange(ts)
	// Traces list view expects time in nanoseconds
	tr := timeRange{
		Start:    q.Start * time.Second.Microseconds(),
		End:      q.End * time.Second.Microseconds(),
		PageSize: 100,
	}

	options := Options{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: constants.TracesListViewDefaultSelectedColumns,
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	filterItems := r.fetchFilters(selectedQuery, lbls)
	urlData := urlShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: builderQuery{
			QueryData: []v3.BuilderQuery{
				{
					DataSource:         v3.DataSourceTraces,
					QueryName:          "A",
					AggregateOperator:  v3.AggregateOperatorNoOp,
					AggregateAttribute: v3.AttributeKey{},
					Filters: &v3.FilterSet{
						Items:    filterItems,
						Operator: "AND",
					},
					Expression:   "A",
					Disabled:     false,
					Having:       []v3.Having{},
					StepInterval: 60,
					OrderBy: []v3.OrderBy{
						{
							ColumnName: "timestamp",
							Order:      "desc",
						},
					},
				},
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(string(data))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
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

func (r *ThresholdRule) prepareClickhouseQueries(ts time.Time) (map[string]string, error) {
	queries := make(map[string]string)

	if r.ruleCondition == nil {
		return nil, fmt.Errorf("rule condition is empty")
	}

	if r.ruleCondition.QueryType() != v3.QueryTypeClickHouseSQL {
		zap.L().Error("unsupported query type in prepareClickhouseQueries", zap.String("ruleid", r.ID()))
		return nil, fmt.Errorf("failed to prepare clickhouse queries")
	}

	params := r.prepareQueryRange(ts)

	// replace reserved go template variables
	querytemplate.AssignReservedVarsV3(params)

	for name, chQuery := range r.ruleCondition.CompositeQuery.ClickHouseQueries {
		if chQuery.Disabled {
			continue
		}
		tmpl := template.New("clickhouse-query")
		tmpl, err := tmpl.Parse(chQuery.Query)
		if err != nil {
			zap.L().Error("failed to parse clickhouse query to populate vars", zap.String("ruleid", r.ID()), zap.Error(err))
			r.SetHealth(HealthBad)
			return nil, err
		}
		var query bytes.Buffer
		err = tmpl.Execute(&query, params.Variables)
		if err != nil {
			zap.L().Error("failed to populate clickhouse query", zap.String("ruleid", r.ID()), zap.Error(err))
			r.SetHealth(HealthBad)
			return nil, err
		}
		queries[name] = query.String()
	}
	return queries, nil
}

func (r *ThresholdRule) GetSelectedQuery() string {

	// The actual query string is not relevant here
	// we just need to know the selected query

	var queries map[string]string
	var err error

	if r.ruleCondition.QueryType() == v3.QueryTypeBuilder {
		queries, err = r.prepareBuilderQueries(time.Now(), nil)
		if err != nil {
			zap.L().Error("failed to prepare metric queries", zap.String("ruleid", r.ID()), zap.Error(err))
			return ""
		}
	} else if r.ruleCondition.QueryType() == v3.QueryTypeClickHouseSQL {
		queries, err = r.prepareClickhouseQueries(time.Now())
		if err != nil {
			zap.L().Error("failed to prepare clickhouse queries", zap.String("ruleid", r.ID()), zap.Error(err))
			return ""
		}
	}

	if r.ruleCondition != nil {
		if r.ruleCondition.SelectedQuery != "" {
			return r.ruleCondition.SelectedQuery
		}

		// The following logic exists for backward compatibility
		// If there is no selected query, then
		// - check if F1 is present, if yes, return F1
		// - else return the query with max ascii value
		// this logic is not really correct. we should be considering
		// whether the query is enabled or not. but this is a temporary
		// fix to support backward compatibility
		if _, ok := queries["F1"]; ok {
			return "F1"
		}
		keys := make([]string, 0, len(queries))
		for k := range queries {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		return keys[len(keys)-1]
	}
	// This should never happen
	return ""
}

// query looks if alert condition is being
// satisfied and returns the signals
func (r *ThresholdRule) buildAndRunQuery(ctx context.Context, ts time.Time, ch clickhouse.Conn) (Vector, error) {
	if r.ruleCondition == nil || r.ruleCondition.CompositeQuery == nil {
		r.SetHealth(HealthBad)
		return nil, fmt.Errorf("invalid rule condition")
	}

	// var to hold target query to be executed
	var queries map[string]string
	var err error

	// fetch the target query based on query type
	if r.ruleCondition.QueryType() == v3.QueryTypeBuilder {

		queries, err = r.prepareBuilderQueries(ts, ch)

		if err != nil {
			zap.L().Error("failed to prepare metric queries", zap.String("ruleid", r.ID()), zap.Error(err))
			return nil, fmt.Errorf("failed to prepare metric queries")
		}

	} else if r.ruleCondition.QueryType() == v3.QueryTypeClickHouseSQL {

		queries, err = r.prepareClickhouseQueries(ts)

		if err != nil {
			zap.L().Error("failed to prepare clickhouse queries", zap.String("ruleid", r.ID()), zap.Error(err))
			return nil, fmt.Errorf("failed to prepare clickhouse queries")
		}

	} else {
		return nil, fmt.Errorf("unexpected rule condition - query type is empty")
	}

	if len(queries) == 0 {
		return nil, fmt.Errorf("no queries could be built with the rule config")
	}

	zap.L().Info("prepared queries", zap.String("ruleid", r.ID()), zap.Any("queries", queries))

	queryLabel := r.GetSelectedQuery()
	zap.L().Debug("Selected query lable for rule", zap.String("ruleid", r.ID()), zap.String("label", queryLabel))

	if queryString, ok := queries[queryLabel]; ok {
		return r.runChQuery(ctx, ch, queryString)
	}

	zap.L().Error("invalid query label", zap.String("ruleid", r.ID()), zap.String("label", queryLabel), zap.Any("queries", queries))
	return nil, fmt.Errorf("this is unexpected, invalid query label")
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

func (r *ThresholdRule) Eval(ctx context.Context, ts time.Time, queriers *Queriers) (interface{}, error) {

	valueFormatter := formatter.FromUnit(r.Unit())
	res, err := r.buildAndRunQuery(ctx, ts, queriers.Ch)

	if err != nil {
		r.SetHealth(HealthBad)
		r.SetLastError(err)
		zap.L().Error("failure in buildAndRunQuery", zap.String("ruleid", r.ID()), zap.Error(err))
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	var alerts = make(map[uint64]*Alert, len(res))

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		value := valueFormatter.Format(smpl.V, r.Unit())
		thresholdFormatter := formatter.FromUnit(r.ruleCondition.TargetUnit)
		threshold := thresholdFormatter.Format(r.targetVal(), r.ruleCondition.TargetUnit)
		zap.L().Debug("Alert template data for rule", zap.String("name", r.Name()), zap.String("formatter", valueFormatter.Name()), zap.String("value", value), zap.String("threshold", threshold))

		tmplData := AlertTemplateData(l, value, threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		// utility function to apply go template on labels and annotations
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
				zap.L().Error("Expanding alert template failed", zap.Error(err), zap.Any("data", tmplData))
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(labels.MetricNameLabel)

		for _, l := range r.labels {
			lb.Set(l.Name, expand(l.Value))
		}

		lb.Set(labels.AlertNameLabel, r.Name())
		lb.Set(labels.AlertRuleIdLabel, r.ID())
		lb.Set(labels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(labels.Labels, 0, len(r.annotations))
		for _, a := range r.annotations {
			if smpl.IsMissing {
				if a.Name == labels.AlertDescriptionLabel || a.Name == labels.AlertSummaryLabel {
					a.Value = labels.AlertMissingData
				}
			}
			annotations = append(annotations, labels.Label{Name: normalizeLabelName(a.Name), Value: expand(a.Value)})
		}

		// Links with timestamps should go in annotations since labels
		// is used alert grouping, and we want to group alerts with the same
		// label set, but different timestamps, together.
		if r.typ == "TRACES_BASED_ALERT" {
			link := r.prepareLinksToTraces(ts, smpl.MetricOrig)
			if link != "" && r.hostFromSource() != "" {
				annotations = append(annotations, labels.Label{Name: "related_traces", Value: fmt.Sprintf("%s/traces-explorer?%s", r.hostFromSource(), link)})
			}
		} else if r.typ == "LOGS_BASED_ALERT" {
			link := r.prepareLinksToLogs(ts, smpl.MetricOrig)
			if link != "" && r.hostFromSource() != "" {
				annotations = append(annotations, labels.Label{Name: "related_logs", Value: fmt.Sprintf("%s/logs/logs-explorer?%s", r.hostFromSource(), link)})
			}
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			zap.L().Error("the alert query returns duplicate records", zap.String("ruleid", r.ID()), zap.Any("alert", alerts[h]))
			err = fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
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
			Value:        smpl.V,
			GeneratorURL: r.GeneratorURL(),
			Receivers:    r.preferredChannels,
		}
	}

	zap.L().Info("alerts found", zap.String("name", r.Name()), zap.Int("count", len(alerts)))

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

func (r *ThresholdRule) String() string {

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
