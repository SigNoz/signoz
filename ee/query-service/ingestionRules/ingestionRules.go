package ingestionRules

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/ee/query-service/model"
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

// PostableIngestionRule captures user inputs in setting the ingestion rule
type PostableIngestionRule struct {
	Name        string               `json:"name"`
	Source      IngestionSource      `json:"source"`
	RuleType    IngestionRuleType    `json:"ruleType"`
	RuleSubType IngestionRuleSubtype `json:"ruleSubType"`
	Priority    int                  `json:"priority"`
	Config      *IngestionRuleConfig `json:"config"`
}

// IsValid checks if postable rule has all the required params
func (p *PostableIngestionRule) IsValid() *model.ApiError {
	if p.Name == "" {
		return model.BadRequestStr("ingestion rule name is required")
	}
	if p.RuleType == "" {
		return model.BadRequestStr("ingestion rule type is required")
	}

	if p.RuleSubType == "" {
		return model.BadRequestStr("ingestion rule subtype is required")
	}

	if p.Source == "" {
		return model.BadRequestStr("ingestion source is required")
	}

	return nil
}

type Creator struct {
	CreatedBy string
	Created   time.Time
}

type Updater struct {
	UpdatedBy string
	Updated   time.Time
}

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

	// deployment status maintained by provisioner
	DeployStatus   DeployStatus `json:"deployStatus,omitempty" db:"deployment_status"`
	DeploySequence int          `json:"deploySequence,omitempty" db:"deployment_sequence"`

	ErrorMessage string `json:"error_message" db:"error_message"`
	Creator
	Updater
}

func (i *IngestionRule) parseConfig() error {
	c := IngestionRuleConfig{}
	err := json.Unmarshal([]byte(i.RawConfig), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = &c
	return nil
}

type DeployStatus string

const (
	PendingDeploy DeployStatus = "DIRTY"
	Deploying     DeployStatus = "DEPLOYING"
	Deployed      DeployStatus = "DEPLOYED"
	DeployFailed  DeployStatus = "FAILED"
)

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
