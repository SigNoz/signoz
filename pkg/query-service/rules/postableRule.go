package rules

import (
	"context"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/pkg/errors"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/utils/times"
	"go.signoz.io/query-service/utils/timestamp"
	yaml "gopkg.in/yaml.v2"
)

type RuleCondition struct {
	CompositeMetricQuery *model.CompositeMetricQuery `json:"compositeMetricQuery,omitempty" yaml:"compositeMetricQuery,omitempty"`
}

// PostableRule is used to create alerting rule from HTTP api
type PostableRule struct {
	Alert         string            `yaml:"alert,omitempty" json:"alert,omitempty"`
	RuleType      RuleType          `yaml:"ruleType,omitempty" json:"ruleType,omitempty"`
	EvalWindow    time.Duration     `yaml:"evalWindow,omitempty" json:"evalWindow,omitempty"`
	Frequency     time.Duration     `yaml:"frequency,omitempty" json:"frequency,omitempty"`
	RuleCondition RuleCondition     `yaml:"condition,omitempty" json:"condition,omitempty"`
	Labels        map[string]string `yaml:"labels,omitempty" json:"labels,omitempty"`
	Annotations   map[string]string `yaml:"annotations,omitempty" json:"annotations,omitempty"`
}

func ParsePostableRule(content []byte) (*PostableRule, []error) {
	rule := PostableRule{}
	if err := yaml.Unmarshal(content, &rule); err != nil {
		return nil, []error{err}
	}
	fmt.Println("postable rule:", rule)
	if errs := rule.Validate(); len(errs) > 0 {
		return nil, errs
	}
	return &rule, []error{}
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
