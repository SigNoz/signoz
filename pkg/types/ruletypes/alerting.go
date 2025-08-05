package ruletypes

import (
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/query-service/converter"
	"math"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
)

// this file contains common structs and methods used by
// rule engine

const (
	// how long before re-sending the alert
	ResolvedRetention = 15 * time.Minute
	TestAlertPostFix  = "_TEST_ALERT"
)

type RuleType string

const (
	RuleTypeThreshold = "threshold_rule"
	RuleTypeProm      = "promql_rule"
	RuleTypeAnomaly   = "anomaly_rule"
)

type RuleHealth string

const (
	HealthUnknown RuleHealth = "unknown"
	HealthGood    RuleHealth = "ok"
	HealthBad     RuleHealth = "err"
)

type Alert struct {
	State model.AlertState

	Labels      labels.BaseLabels
	Annotations labels.BaseLabels

	QueryResultLables labels.BaseLabels

	GeneratorURL string

	// list of preferred receivers, e.g. slack
	Receivers []string

	Value      float64
	ActiveAt   time.Time
	FiredAt    time.Time
	ResolvedAt time.Time
	LastSentAt time.Time
	ValidUntil time.Time

	Missing bool
}

func (a *Alert) NeedsSending(ts time.Time, resendDelay time.Duration) bool {
	if a.State == model.StatePending {
		return false
	}

	// if an alert has been resolved since the last send, resend it
	if a.ResolvedAt.After(a.LastSentAt) {
		return true
	}

	return a.LastSentAt.Add(resendDelay).Before(ts)
}

type NamedAlert struct {
	Name string
	*Alert
}

type CompareOp string

const (
	CompareOpNone      CompareOp = "0"
	ValueIsAbove       CompareOp = "1"
	ValueIsBelow       CompareOp = "2"
	ValueIsEq          CompareOp = "3"
	ValueIsNotEq       CompareOp = "4"
	ValueAboveOrEq     CompareOp = "5"
	ValueBelowOrEq     CompareOp = "6"
	ValueOutsideBounds CompareOp = "7"
)

type MatchType string

const (
	MatchTypeNone MatchType = "0"
	AtleastOnce   MatchType = "1"
	AllTheTimes   MatchType = "2"
	OnAverage     MatchType = "3"
	InTotal       MatchType = "4"
	Last          MatchType = "5"
)

type RuleThreshold interface {
	Name() string
	Target() float64
	RecoveryTarget() float64

	MatchType() MatchType
	CompareOp() CompareOp

	SelectedQuery() string
	ShouldAlert(series v3.Series) (Sample, bool)
}

type BasicRuleThreshold struct {
	name           string
	target         *float64
	targetUnit     string
	ruleUnit       string
	recoveryTarget *float64
	matchType      MatchType
	compareOp      CompareOp
	selectedQuery  string
}

func NewBasicRuleThreshold(name string, target *float64, recoveryTarget *float64, matchType MatchType, op CompareOp, selectedQuery string, targetUnit string, ruleUnit string) *BasicRuleThreshold {
	return &BasicRuleThreshold{name: name, target: target, recoveryTarget: recoveryTarget, matchType: matchType, selectedQuery: selectedQuery, compareOp: op, targetUnit: targetUnit, ruleUnit: ruleUnit}
}

func (b BasicRuleThreshold) Name() string {
	return b.name
}

func (b BasicRuleThreshold) Target() float64 {
	unitConverter := converter.FromUnit(converter.Unit(b.targetUnit))
	// convert the target value to the y-axis unit
	value := unitConverter.Convert(converter.Value{
		F: *b.target,
		U: converter.Unit(b.targetUnit),
	}, converter.Unit(b.ruleUnit))
	return value.F
}

func (b BasicRuleThreshold) RecoveryTarget() float64 {
	return *b.recoveryTarget
}

func (b BasicRuleThreshold) MatchType() MatchType {
	return b.matchType
}

func (b BasicRuleThreshold) CompareOp() CompareOp {
	return b.compareOp
}

func (b BasicRuleThreshold) SelectedQuery() string {
	return b.selectedQuery
}

func removeGroupinSetPoints(series v3.Series) []v3.Point {
	var result []v3.Point
	for _, s := range series.Points {
		if s.Timestamp >= 0 && !math.IsNaN(s.Value) && !math.IsInf(s.Value, 0) {
			result = append(result, s)
		}
	}
	return result
}

func (b BasicRuleThreshold) ShouldAlert(series v3.Series) (Sample, bool) {
	var shouldAlert bool
	var alertSmpl Sample
	var lbls qslabels.Labels

	for name, value := range series.Labels {
		lbls = append(lbls, qslabels.Label{Name: name, Value: value})
	}

	lbls = append(lbls, qslabels.Label{Name: "threshold", Value: b.name})

	series.Points = removeGroupinSetPoints(series)

	// nothing to evaluate
	if len(series.Points) == 0 {
		return alertSmpl, false
	}

	switch b.MatchType() {
	case AtleastOnce:
		// If any sample matches the condition, the rule is firing.
		if b.CompareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value > b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value < b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp() == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value == b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp() == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value != b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		} else if b.CompareOp() == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) >= b.Target() {
					alertSmpl = Sample{Point: Point{V: smpl.Value}, Metric: lbls}
					shouldAlert = true
					break
				}
			}
		}
	case AllTheTimes:
		// If all samples match the condition, the rule is firing.
		shouldAlert = true
		alertSmpl = Sample{Point: Point{V: b.Target()}, Metric: lbls}
		if b.CompareOp() == ValueIsAbove {
			for _, smpl := range series.Points {
				if smpl.Value <= b.Target() {
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
		} else if b.CompareOp() == ValueIsBelow {
			for _, smpl := range series.Points {
				if smpl.Value >= b.Target() {
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
		} else if b.CompareOp() == ValueIsEq {
			for _, smpl := range series.Points {
				if smpl.Value != b.Target() {
					shouldAlert = false
					break
				}
			}
		} else if b.CompareOp() == ValueIsNotEq {
			for _, smpl := range series.Points {
				if smpl.Value == b.Target() {
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
		} else if b.CompareOp() == ValueOutsideBounds {
			for _, smpl := range series.Points {
				if math.Abs(smpl.Value) < b.Target() {
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
		if b.CompareOp() == ValueIsAbove {
			if avg > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsBelow {
			if avg < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsEq {
			if avg == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsNotEq {
			if avg != b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueOutsideBounds {
			if math.Abs(avg) >= b.Target() {
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
		if b.CompareOp() == ValueIsAbove {
			if sum > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsBelow {
			if sum < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsEq {
			if sum == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsNotEq {
			if sum != b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueOutsideBounds {
			if math.Abs(sum) >= b.Target() {
				shouldAlert = true
			}
		}
	case Last:
		// If the last sample matches the condition, the rule is firing.
		shouldAlert = false
		alertSmpl = Sample{Point: Point{V: series.Points[len(series.Points)-1].Value}, Metric: lbls}
		if b.CompareOp() == ValueIsAbove {
			if series.Points[len(series.Points)-1].Value > b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsBelow {
			if series.Points[len(series.Points)-1].Value < b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsEq {
			if series.Points[len(series.Points)-1].Value == b.Target() {
				shouldAlert = true
			}
		} else if b.CompareOp() == ValueIsNotEq {
			if series.Points[len(series.Points)-1].Value != b.Target() {
				shouldAlert = true
			}
		}
	}
	return alertSmpl, shouldAlert
}

type RuleCondition struct {
	CompositeQuery    *v3.CompositeQuery `json:"compositeQuery,omitempty" yaml:"compositeQuery,omitempty"`
	CompareOp         CompareOp          `yaml:"op,omitempty" json:"op,omitempty"`
	Target            *float64           `yaml:"target,omitempty" json:"target,omitempty"`
	AlertOnAbsent     bool               `yaml:"alertOnAbsent,omitempty" json:"alertOnAbsent,omitempty"`
	AbsentFor         uint64             `yaml:"absentFor,omitempty" json:"absentFor,omitempty"`
	MatchType         MatchType          `json:"matchType,omitempty"`
	TargetUnit        string             `json:"targetUnit,omitempty"`
	Algorithm         string             `json:"algorithm,omitempty"`
	Seasonality       string             `json:"seasonality,omitempty"`
	SelectedQuery     string             `json:"selectedQueryName,omitempty"`
	RequireMinPoints  bool               `yaml:"requireMinPoints,omitempty" json:"requireMinPoints,omitempty"`
	RequiredNumPoints int                `yaml:"requiredNumPoints,omitempty" json:"requiredNumPoints,omitempty"`
	Thresholds        []RuleThreshold    `yaml:"thresholds,omitempty" json:"thresholds,omitempty"`
}

func (rc *RuleCondition) GetSelectedQueryName() string {
	if rc != nil {
		if rc.SelectedQuery != "" {
			return rc.SelectedQuery
		}

		queryNames := map[string]struct{}{}

		if rc.CompositeQuery != nil {
			if rc.QueryType() == v3.QueryTypeBuilder {
				for name := range rc.CompositeQuery.BuilderQueries {
					queryNames[name] = struct{}{}
				}
			} else if rc.QueryType() == v3.QueryTypeClickHouseSQL {
				for name := range rc.CompositeQuery.ClickHouseQueries {
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

func (rc *RuleCondition) IsValid() bool {

	if rc.CompositeQuery == nil {
		return false
	}

	if rc.QueryType() == v3.QueryTypeBuilder {
		if rc.Target == nil {
			return false
		}
		if rc.CompareOp == "" {
			return false
		}
	}
	if rc.QueryType() == v3.QueryTypePromQL {

		if len(rc.CompositeQuery.PromQueries) == 0 && len(rc.CompositeQuery.Queries) == 0 {
			return false
		}
	}
	return true
}

// QueryType is a short hand method to get query type
func (rc *RuleCondition) QueryType() v3.QueryType {
	if rc.CompositeQuery != nil {
		return rc.CompositeQuery.QueryType
	}
	return v3.QueryTypeUnknown
}

// String is useful in printing rule condition in logs
func (rc *RuleCondition) String() string {
	if rc == nil {
		return ""
	}
	data, _ := json.Marshal(*rc)
	return string(data)
}

// prepareRuleGeneratorURL creates an appropriate url
// for the rule. the URL is sent in slack messages as well as
// to other systems and allows backtracking to the rule definition
// from the third party systems.
func PrepareRuleGeneratorURL(ruleId string, source string) string {
	if source == "" {
		return source
	}

	// check if source is a valid url
	parsedSource, err := url.Parse(source)
	if err != nil {
		return ""
	}
	// since we capture window.location when a new rule is created
	// we end up with rulesource host:port/alerts/new. in this case
	// we want to replace new with rule id parameter

	hasNew := strings.LastIndex(source, "new")
	if hasNew > -1 {
		ruleURL := fmt.Sprintf("%sedit?ruleId=%s", source[0:hasNew], ruleId)
		return ruleURL
	}

	// The source contains the encoded query, start and end time
	// and other parameters. We don't want to include them in the generator URL
	// mainly to keep the URL short and lower the alert body contents
	// The generator URL with /alerts/edit?ruleId= is enough
	if parsedSource.Port() != "" {
		return fmt.Sprintf("%s://%s:%s/alerts/edit?ruleId=%s", parsedSource.Scheme, parsedSource.Hostname(), parsedSource.Port(), ruleId)
	}
	return fmt.Sprintf("%s://%s/alerts/edit?ruleId=%s", parsedSource.Scheme, parsedSource.Hostname(), ruleId)
}
