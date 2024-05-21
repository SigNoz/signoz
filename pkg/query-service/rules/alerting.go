package rules

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/pkg/errors"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
)

// this file contains common structs and methods used by
// rule engine

const (
	// how long before re-sending the alert
	resolvedRetention = 15 * time.Minute

	TestAlertPostFix = "_TEST_ALERT"
)

type RuleType string

const (
	RuleTypeThreshold = "threshold_rule"
	RuleTypeProm      = "promql_rule"
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
	StateDisabled
)

func (s AlertState) String() string {
	switch s {
	case StateInactive:
		return "inactive"
	case StatePending:
		return "pending"
	case StateFiring:
		return "firing"
	case StateDisabled:
		return "disabled"
	}
	panic(errors.Errorf("unknown alert state: %d", s))
}

type Alert struct {
	State AlertState

	Labels      labels.BaseLabels
	Annotations labels.BaseLabels

	GeneratorURL string

	// list of preferred receivers, e.g. slack
	Receivers []string

	Value      float64
	ActiveAt   time.Time
	FiredAt    time.Time
	ResolvedAt time.Time
	LastSentAt time.Time
	ValidUntil time.Time
}

func (a *Alert) needsSending(ts time.Time, resendDelay time.Duration) bool {
	if a.State == StatePending {
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
	CompareOpNone CompareOp = "0"
	ValueIsAbove  CompareOp = "1"
	ValueIsBelow  CompareOp = "2"
	ValueIsEq     CompareOp = "3"
	ValueIsNotEq  CompareOp = "4"
)

func ResolveCompareOp(cop CompareOp) string {
	switch cop {
	case ValueIsAbove:
		return ">"
	case ValueIsBelow:
		return "<"
	case ValueIsEq:
		return "=="
	case ValueIsNotEq:
		return "!="
	}
	return ""
}

type MatchType string

const (
	MatchTypeNone MatchType = "0"
	AtleastOnce   MatchType = "1"
	AllTheTimes   MatchType = "2"
	OnAverage     MatchType = "3"
	InTotal       MatchType = "4"
)

type RuleCondition struct {
	CompositeQuery *v3.CompositeQuery `json:"compositeQuery,omitempty" yaml:"compositeQuery,omitempty"`
	CompareOp      CompareOp          `yaml:"op,omitempty" json:"op,omitempty"`
	Target         *float64           `yaml:"target,omitempty" json:"target,omitempty"`
	AlertOnAbsent  bool               `yaml:"alertOnAbsent,omitempty" json:"alertOnAbsent,omitempty"`
	AbsentFor      uint64             `yaml:"absentFor,omitempty" json:"absentFor,omitempty"`
	MatchType      MatchType          `json:"matchType,omitempty"`
	TargetUnit     string             `json:"targetUnit,omitempty"`
	SelectedQuery  string             `json:"selectedQueryName,omitempty"`
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

		if len(rc.CompositeQuery.PromQueries) == 0 {
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

type Duration time.Duration

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case float64:
		*d = Duration(time.Duration(value))
		return nil
	case string:
		tmp, err := time.ParseDuration(value)
		if err != nil {
			return err
		}
		*d = Duration(tmp)

		return nil
	default:
		return errors.New("invalid duration")
	}
}

// prepareRuleGeneratorURL creates an appropriate url
// for the rule. the URL is sent in slack messages as well as
// to other systems and allows backtracking to the rule definition
// from the third party systems.
func prepareRuleGeneratorURL(ruleId string, source string) string {
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
