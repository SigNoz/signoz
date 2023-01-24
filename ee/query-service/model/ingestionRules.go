package model

import (
	"encoding/json"
	"fmt"

	"github.com/pkg/errors"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

// this file contains all the model definitions
// required for cost optimizer

const (
	MetricName        = "metric_name"
	ResourceAttribute = "resource_attribute"
	Label             = "label"
)

// IngestionSource identifies the source data on which the ingestion rule will run on
type IngestionSource string

const (
	IngestionSourceMetrics = "metrics"
	IngestionSourceLogs    = "logs"
	IngestionSourceTraces  = "traces"
)

// IngestionRuleType identifies the type of rule: drop, sampling, inclusion
type IngestionRuleType string

const (
	IngestionRuleTypeDrop     = "drop_rule"
	IngestionRuleTypeSampling = "sampling_rule"
)

// IngestionRuleSubtype identifies sub type of rules and is
// dependent on  IngestionRuleType
type IngestionRuleSubtype string

const (
	IngestionRuleSubTypeAO   IngestionRuleSubtype = "always_on"
	IngestionRuleSubTypeCond IngestionRuleSubtype = "conditional"
)

// IngestionRule is stored and also deployed finally to collector config
type IngestionRule struct {
	Id          string               `json:"id,omitempty" db:"id"`
	Name        string               `json:"name,omitempty" db:"name"`
	Priority    int                  `json:"priority,omitempty" db:"priority"`
	Source      IngestionSource      `json:"source" db:"source"`
	RuleType    IngestionRuleType    `json:"ruleType" db:"rule_type"`
	RuleSubType IngestionRuleSubtype `json:"ruleSubType" db:"rule_subtype"`

	// configuration for drop and sampling rules
	RawConfig string `db:"config_json"`

	Config *IngestionRuleConfig `json:"config"`

	Creator
	Updater
}

func (i *IngestionRule) ID() string {
	return i.Id
}

func (i *IngestionRule) ParseRawConfig() error {
	c := IngestionRuleConfig{}
	err := json.Unmarshal([]byte(i.RawConfig), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = &c
	return nil
}

// IngestionRuleConfig identifies a rule configuration that turns into
// an input for  processor in collector config. An ingestion rule is
// more likely to have either drop or a sampling config but not both
// at the same time. however this structure does not discourage such a
// condition.
type IngestionRuleConfig struct {
	DropConfig
	SamplingConfig
}

// DropConfig configuration for dropping metrics, logs or traces record
type DropConfig struct {
	// identifies filters for this drop rule
	FilterSet basemodel.FilterSet
}

// PrepareExpression prepares an OTTL expression that can be passed to
// filter processor.
func (d *DropConfig) PrepareExpression() (result string, fnerr error) {

	// holds a list of expressions
	var exprs []string

	for _, i := range d.FilterSet.Items {
		var expr string
		switch i.KeyType {
		case MetricName:
			// todo(amol): may need to transform operator to OTTL
			// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md#boolean-expressions
			expr = fmt.Sprintf("name %s \"%s\"", i.Operator, i.Value)
		case ResourceAttribute:
			expr = fmt.Sprintf("resource.attributes[\"%s\"] %s \"%s\"", i.Key, i.Operator, i.Value)
		case Label:
			expr = fmt.Sprintf("attributes[\"%s\"] %s \"%s\"", i.Key, i.Operator, i.Value)
		}
		if expr != "" {
			exprs = append(exprs, expr)
		}
	}

	if len(exprs) == 0 {
		return
	}

	result = exprs[0]

	for _, e := range exprs[1:] {
		result += fmt.Sprintf(" %s %s", d.FilterSet.Operator, e)
	}
	return
}

type SamplingConfig struct {
}
