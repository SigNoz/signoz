package ruletypes

import (
	"context"
	"encoding/json"
	"time"
	"unicode/utf8"

	signozError "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"

	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"
)

type AlertType string

const (
	AlertTypeMetric     AlertType = "METRIC_BASED_ALERT"
	AlertTypeTraces     AlertType = "TRACES_BASED_ALERT"
	AlertTypeLogs       AlertType = "LOGS_BASED_ALERT"
	AlertTypeExceptions AlertType = "EXCEPTIONS_BASED_ALERT"
)

type RuleDataKind string

const (
	RuleDataKindJson RuleDataKind = "json"
)

// PostableRule is used to create alerting rule from HTTP api
type PostableRule struct {
	AlertName   string    `json:"alert,omitempty"`
	AlertType   AlertType `json:"alertType,omitempty"`
	Description string    `json:"description,omitempty"`
	RuleType    RuleType  `json:"ruleType,omitempty"`
	EvalWindow  Duration  `json:"evalWindow,omitempty"`
	Frequency   Duration  `json:"frequency,omitempty"`

	RuleCondition *RuleCondition    `json:"condition,omitempty"`
	Labels        map[string]string `json:"labels,omitempty"`
	Annotations   map[string]string `json:"annotations,omitempty"`

	Disabled bool `json:"disabled"`

	// Source captures the source url where rule has been created
	Source string `json:"source,omitempty"`

	PreferredChannels []string `json:"preferredChannels,omitempty"`

	Version string `json:"version,omitempty"`

	Evaluation *EvaluationEnvelope `yaml:"evaluation,omitempty" json:"evaluation,omitempty"`
}

func (r *PostableRule) processRuleDefaults() error {

	if r.EvalWindow == 0 {
		r.EvalWindow = Duration(5 * time.Minute)
	}

	if r.Frequency == 0 {
		r.Frequency = Duration(1 * time.Minute)
	}

	if r.RuleCondition != nil {
		if r.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder {
			if r.RuleType == "" {
				r.RuleType = RuleTypeThreshold
			}
		} else if r.RuleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
			r.RuleType = RuleTypeProm
		}

		for qLabel, q := range r.RuleCondition.CompositeQuery.BuilderQueries {
			if q.AggregateAttribute.Key != "" && q.Expression == "" {
				q.Expression = qLabel
			}
		}
		//added alerts v2 fields
		if r.RuleCondition.Thresholds == nil {
			thresholdName := CriticalThresholdName
			if r.Labels != nil {
				if severity, ok := r.Labels["severity"]; ok {
					thresholdName = severity
				}
			}
			thresholdData := RuleThresholdData{
				Kind: BasicThresholdKind,
				Spec: BasicRuleThresholds{{
					Name:        thresholdName,
					RuleUnit:    r.RuleCondition.CompositeQuery.Unit,
					TargetUnit:  r.RuleCondition.TargetUnit,
					TargetValue: r.RuleCondition.Target,
					MatchType:   r.RuleCondition.MatchType,
					CompareOp:   r.RuleCondition.CompareOp,
				}},
			}
			r.RuleCondition.Thresholds = &thresholdData
		}
	}
	if r.Evaluation == nil {
		r.Evaluation = &EvaluationEnvelope{RollingEvaluation, RollingWindow{EvalWindow: r.EvalWindow, Frequency: r.Frequency}}
	}

	return r.Validate()
}

func (r *PostableRule) UnmarshalJSON(bytes []byte) error {
	type Alias PostableRule
	aux := (*Alias)(r)
	if err := json.Unmarshal(bytes, aux); err != nil {
		return signozError.NewInvalidInputf(signozError.CodeInvalidInput, "failed to parse json: %v", err)
	}
	return r.processRuleDefaults()
}

func isValidLabelName(ln string) bool {
	if len(ln) == 0 {
		return false
	}
	for i, b := range ln {
		if !((b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || b == '_' || (b >= '0' && b <= '9' && i > 0)) {
			return false
		}
	}
	return true
}

func isValidLabelValue(v string) bool {
	return utf8.ValidString(v)
}

func isAllQueriesDisabled(compositeQuery *v3.CompositeQuery) bool {
	if compositeQuery == nil {
		return false
	}
	if compositeQuery.BuilderQueries == nil && compositeQuery.PromQueries == nil && compositeQuery.ClickHouseQueries == nil {
		return false
	}
	switch compositeQuery.QueryType {
	case v3.QueryTypeBuilder:
		if len(compositeQuery.BuilderQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.BuilderQueries {
			if !query.Disabled {
				return false
			}
		}
	case v3.QueryTypePromQL:
		if len(compositeQuery.PromQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.PromQueries {
			if !query.Disabled {
				return false
			}
		}
	case v3.QueryTypeClickHouseSQL:
		if len(compositeQuery.ClickHouseQueries) == 0 {
			return false
		}
		for _, query := range compositeQuery.ClickHouseQueries {
			if !query.Disabled {
				return false
			}
		}
	}
	return true
}

func (r *PostableRule) Validate() error {

	var errs []error

	if r.RuleCondition == nil {
		// will get panic if we try to access CompositeQuery, so return here
		return signozError.NewInvalidInputf(signozError.CodeInvalidInput, "rule condition is required")
	} else {
		if r.RuleCondition.CompositeQuery == nil {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "composite metric query is required"))
		}
	}

	if isAllQueriesDisabled(r.RuleCondition.CompositeQuery) {
		errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "all queries are disabled in rule condition"))
	}

	for k, v := range r.Labels {
		if !isValidLabelName(k) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid label name: %s", k))
		}

		if !isValidLabelValue(v) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid label value: %s", v))
		}
	}

	for k := range r.Annotations {
		if !isValidLabelName(k) {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "invalid annotation name: %s", k))
		}
	}

	errs = append(errs, testTemplateParsing(r)...)
	return signozError.Join(errs...)
}

func testTemplateParsing(rl *PostableRule) (errs []error) {
	if rl.AlertName == "" {
		// Not an alerting rule.
		return errs
	}

	// Trying to parse templates.
	tmplData := AlertTemplateData(make(map[string]string), "0", "0")
	defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"
	parseTest := func(text string) error {
		tmpl := NewTemplateExpander(
			context.TODO(),
			defs+text,
			"__alert_"+rl.AlertName,
			tmplData,
			times.Time(timestamp.FromTime(time.Now())),
			nil,
		)
		return tmpl.ParseTest()
	}

	// Parsing Labels.
	for _, val := range rl.Labels {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "template parsing error: %s", err.Error()))
		}
	}

	// Parsing Annotations.
	for _, val := range rl.Annotations {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, signozError.NewInvalidInputf(signozError.CodeInvalidInput, "template parsing error: %s", err.Error()))
		}
	}

	return errs
}

// GettableRules has info for all stored rules.
type GettableRules struct {
	Rules []*GettableRule `json:"rules"`
}

// GettableRule has info for an alerting rules.
type GettableRule struct {
	Id    string           `json:"id"`
	State model.AlertState `json:"state"`
	PostableRule
	CreatedAt *time.Time `json:"createAt"`
	CreatedBy *string    `json:"createBy"`
	UpdatedAt *time.Time `json:"updateAt"`
	UpdatedBy *string    `json:"updateBy"`
}
