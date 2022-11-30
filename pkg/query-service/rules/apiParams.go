package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"
	yaml "gopkg.in/yaml.v2"
)

// this file contains api request and responses to be
// served over http

// newApiErrorInternal returns a new api error object of type internal
func newApiErrorInternal(err error) *model.ApiError {
	return &model.ApiError{Typ: model.ErrorInternal, Err: err}
}

// newApiErrorBadData returns a new api error object of bad request type
func newApiErrorBadData(err error) *model.ApiError {
	return &model.ApiError{Typ: model.ErrorBadData, Err: err}
}

// PostableRule is used to create alerting rule from HTTP api
type PostableRule struct {
	Alert       string   `yaml:"alert,omitempty" json:"alert,omitempty"`
	AlertType   string   `yaml:"alertType,omitempty" json:"alertType,omitempty"`
	Description string   `yaml:"description,omitempty" json:"description,omitempty"`
	RuleType    RuleType `yaml:"ruleType,omitempty" json:"ruleType,omitempty"`
	EvalWindow  Duration `yaml:"evalWindow,omitempty" json:"evalWindow,omitempty"`
	Frequency   Duration `yaml:"frequency,omitempty" json:"frequency,omitempty"`

	RuleCondition *RuleCondition    `yaml:"condition,omitempty" json:"condition,omitempty"`
	Labels        map[string]string `yaml:"labels,omitempty" json:"labels,omitempty"`
	Annotations   map[string]string `yaml:"annotations,omitempty" json:"annotations,omitempty"`

	Disabled bool `json:"disabled"`

	// Source captures the source url where rule has been created
	Source string `json:"source,omitempty"`

	PreferredChannels []string `json:"preferredChannels,omitempty"`

	// legacy
	Expr    string `yaml:"expr,omitempty" json:"expr,omitempty"`
	OldYaml string `json:"yaml,omitempty"`
}

func ParsePostableRule(content []byte) (*PostableRule, []error) {
	return parsePostableRule(content, "json")
}

func parsePostableRule(content []byte, kind string) (*PostableRule, []error) {
	return parseIntoRule(PostableRule{}, content, kind)
}

// parseIntoRule loads the content (data) into PostableRule and also
// validates the end result
func parseIntoRule(initRule PostableRule, content []byte, kind string) (*PostableRule, []error) {

	rule := &initRule

	var err error
	if kind == "json" {
		if err = json.Unmarshal(content, rule); err != nil {
			zap.S().Debugf("postable rule content", string(content), "\t kind:", kind)
			return nil, []error{fmt.Errorf("failed to load json")}
		}
	} else if kind == "yaml" {
		if err = yaml.Unmarshal(content, rule); err != nil {
			zap.S().Debugf("postable rule content", string(content), "\t kind:", kind)
			return nil, []error{fmt.Errorf("failed to load yaml")}
		}
	} else {
		return nil, []error{fmt.Errorf("invalid data type")}
	}
	zap.S().Debugf("postable rule(parsed):", rule)

	if rule.RuleCondition == nil && rule.Expr != "" {
		// account for legacy rules
		rule.RuleType = RuleTypeProm
		rule.EvalWindow = Duration(5 * time.Minute)
		rule.Frequency = Duration(1 * time.Minute)
		rule.RuleCondition = &RuleCondition{
			CompositeMetricQuery: &model.CompositeMetricQuery{
				QueryType: model.PROM,
				PromQueries: map[string]*model.PromQuery{
					"A": {
						Query: rule.Expr,
					},
				},
			},
		}
	}

	if rule.EvalWindow == 0 {
		rule.EvalWindow = Duration(5 * time.Minute)
	}

	if rule.Frequency == 0 {
		rule.Frequency = Duration(1 * time.Minute)
	}

	if rule.RuleCondition != nil {
		if rule.RuleCondition.CompositeMetricQuery.QueryType == model.QUERY_BUILDER {
			rule.RuleType = RuleTypeThreshold
		} else if rule.RuleCondition.CompositeMetricQuery.QueryType == model.PROM {
			rule.RuleType = RuleTypeProm
		}

		for qLabel, q := range rule.RuleCondition.CompositeMetricQuery.BuilderQueries {
			if q.MetricName != "" && q.Expression == "" {
				q.Expression = qLabel
			}
		}
	}

	zap.S().Debugf("postable rule:", rule, "\t condition", rule.RuleCondition.String())

	if errs := rule.Validate(); len(errs) > 0 {
		return nil, errs
	}

	return rule, []error{}
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

func (r *PostableRule) Validate() (errs []error) {

	if r.RuleCondition == nil {
		errs = append(errs, errors.Errorf("rule condition is required"))
	} else {
		if r.RuleCondition.CompositeMetricQuery == nil {
			errs = append(errs, errors.Errorf("composite metric query is required"))
		}
	}

	if r.RuleType == RuleTypeThreshold {
		if r.RuleCondition.Target == nil {
			errs = append(errs, errors.Errorf("rule condition missing the threshold"))
		}
		if r.RuleCondition.CompareOp == "" {
			errs = append(errs, errors.Errorf("rule condition missing the compare op"))
		}
		if r.RuleCondition.MatchType == "" {
			errs = append(errs, errors.Errorf("rule condition missing the match option"))
		}
	}

	for k, v := range r.Labels {
		if !isValidLabelName(k) {
			errs = append(errs, errors.Errorf("invalid label name: %s", k))
		}

		if !isValidLabelValue(v) {
			errs = append(errs, errors.Errorf("invalid label value: %s", v))
		}
	}

	for k := range r.Annotations {
		if !isValidLabelName(k) {
			errs = append(errs, errors.Errorf("invalid annotation name: %s", k))
		}
	}

	errs = append(errs, testTemplateParsing(r)...)
	return errs
}

func testTemplateParsing(rl *PostableRule) (errs []error) {
	if rl.Alert == "" {
		// Not an alerting rule.
		return errs
	}

	// Trying to parse templates.
	tmplData := AlertTemplateData(make(map[string]string), 0)
	defs := "{{$labels := .Labels}}{{$value := .Value}}"
	parseTest := func(text string) error {
		tmpl := NewTemplateExpander(
			context.TODO(),
			defs+text,
			"__alert_"+rl.Alert,
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
			errs = append(errs, fmt.Errorf("msg=%s", err.Error()))
		}
	}

	// Parsing Annotations.
	for _, val := range rl.Annotations {
		err := parseTest(val)
		if err != nil {
			errs = append(errs, fmt.Errorf("msg=%s", err.Error()))
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
	Id    string `json:"id"`
	State string `json:"state"`
	PostableRule
}
