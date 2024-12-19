package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/multierr"

	"go.signoz.io/signoz/pkg/query-service/utils/times"
	"go.signoz.io/signoz/pkg/query-service/utils/timestamp"
	yaml "gopkg.in/yaml.v2"
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
	RuleDataKindYaml RuleDataKind = "yaml"
)

var (
	ErrFailedToParseJSON = errors.New("failed to parse json")
	ErrFailedToParseYAML = errors.New("failed to parse yaml")
	ErrInvalidDataType   = errors.New("invalid data type")
)

// this file contains api request and responses to be
// served over http

// PostableRule is used to create alerting rule from HTTP api
type PostableRule struct {
	AlertName   string    `yaml:"alert,omitempty" json:"alert,omitempty"`
	AlertType   AlertType `yaml:"alertType,omitempty" json:"alertType,omitempty"`
	Description string    `yaml:"description,omitempty" json:"description,omitempty"`
	RuleType    RuleType  `yaml:"ruleType,omitempty" json:"ruleType,omitempty"`
	EvalWindow  Duration  `yaml:"evalWindow,omitempty" json:"evalWindow,omitempty"`
	Frequency   Duration  `yaml:"frequency,omitempty" json:"frequency,omitempty"`

	RuleCondition *RuleCondition    `yaml:"condition,omitempty" json:"condition,omitempty"`
	Labels        map[string]string `yaml:"labels,omitempty" json:"labels,omitempty"`
	Annotations   map[string]string `yaml:"annotations,omitempty" json:"annotations,omitempty"`

	Disabled bool `json:"disabled"`

	// Source captures the source url where rule has been created
	Source string `json:"source,omitempty"`

	PreferredChannels []string `json:"preferredChannels,omitempty"`

	Version string `json:"version,omitempty"`

	// legacy
	Expr    string `yaml:"expr,omitempty" json:"expr,omitempty"`
	OldYaml string `json:"yaml,omitempty"`
}

func ParsePostableRule(content []byte) (*PostableRule, error) {
	return parsePostableRule(content, "json")
}

func parsePostableRule(content []byte, kind RuleDataKind) (*PostableRule, error) {
	return parseIntoRule(PostableRule{}, content, kind)
}

// parseIntoRule loads the content (data) into PostableRule and also
// validates the end result
func parseIntoRule(initRule PostableRule, content []byte, kind RuleDataKind) (*PostableRule, error) {

	rule := &initRule

	var err error
	if kind == RuleDataKindJson {
		if err = json.Unmarshal(content, rule); err != nil {
			return nil, ErrFailedToParseJSON
		}
	} else if kind == RuleDataKindYaml {
		if err = yaml.Unmarshal(content, rule); err != nil {
			return nil, ErrFailedToParseYAML
		}
	} else {
		return nil, ErrInvalidDataType
	}

	if rule.RuleCondition == nil && rule.Expr != "" {
		// account for legacy rules
		rule.RuleType = RuleTypeProm
		rule.EvalWindow = Duration(5 * time.Minute)
		rule.Frequency = Duration(1 * time.Minute)
		rule.RuleCondition = &RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
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
		if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder {
			if rule.RuleType == "" {
				rule.RuleType = RuleTypeThreshold
			}
		} else if rule.RuleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
			rule.RuleType = RuleTypeProm
		}

		for qLabel, q := range rule.RuleCondition.CompositeQuery.BuilderQueries {
			if q.AggregateAttribute.Key != "" && q.Expression == "" {
				q.Expression = qLabel
			}
		}
	}

	if err := rule.Validate(); err != nil {
		return nil, err
	}

	return rule, nil
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
		return errors.Errorf("rule condition is required")
	} else {
		if r.RuleCondition.CompositeQuery == nil {
			errs = append(errs, errors.Errorf("composite metric query is required"))
		}
	}

	if isAllQueriesDisabled(r.RuleCondition.CompositeQuery) {
		errs = append(errs, errors.Errorf("all queries are disabled in rule condition"))
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
	return multierr.Combine(errs...)
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
	Id    string           `json:"id"`
	State model.AlertState `json:"state"`
	PostableRule
	CreatedAt *time.Time `json:"createAt"`
	CreatedBy *string    `json:"createBy"`
	UpdatedAt *time.Time `json:"updateAt"`
	UpdatedBy *string    `json:"updateBy"`
}
