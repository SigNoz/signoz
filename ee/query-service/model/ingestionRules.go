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
	DropFilter basemodel.FilterSet `json:"dropFilter"`
}

// PrepareExpression prepares an OTTL expression that can be passed to
// filter processor.
func (d *DropConfig) PrepareExpression() (result string, fnerr error) {

	// holds a list of expressions
	var exprs []string

	for _, i := range d.DropFilter.Items {
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
		result += fmt.Sprintf(" %s %s", d.DropFilter.Operator, e)
	}
	return
}

type SamplingMethod string

const (
	// allows probabilistic dropping of ingested record to meet
	// a storage objective
	SamplingMethodProbabilistic = "probabilistic"

	// ensures the ingested records that match a the filter are always
	// included in sampled data
	SamplingMethodIncludeAll = "include_all"
)

// SamplingConfig defines a sampling strategy rule
type SamplingConfig struct {
	ID   string `json:"id"`
	Name string `json:"name"`

	// Set to true for sampling rule (root) and false for conditions
	Root bool `json:"root"`

	Priority int `json:"priority"`

	// filter conditions
	FilterSet basemodel.FilterSet `json:"filterSet"`

	SamplingMethod  SamplingMethod `json:"samplingMethod"`
	SamplingPercent int            `json:"samplingPercent"`

	// each rule supports multiple condition filters
	// with their own sampling method and percent.
	// This is expected to be just one level deep structure.
	// e.g This rule will retain all audit logs with threat=true
	// and sample remaining records using prabilistic sampling (50%)
	// root 	(source: audit)
	// 		condition	(threat: true)				IncludeAll	100%
	//		condition	(no filter set)  Default	Probabilistic 50%
	Conditions []SamplingConfig `json:"conditions"`

	// Default would identify capture-all case. The conditions or rules
	// with default flag (true) will always have least priority and
	// no filters.
	Default bool
}

// Valid checks the validity of a sampling rule and its conditions
func (sc SamplingConfig) Valid() error {
	if sc.Name == "" {
		return fmt.Errorf("name is required for all sampling rules")
	}

	if sc.Root {
		if !sc.Default && len(sc.FilterSet.Items) != 1 {
			// non-default rule has no filter set, raise an error
			return fmt.Errorf(fmt.Sprintf("invalid filter for sampling rule (%s)", sc.Name))
		}

		// go through conditions and ensure only on empty filter exists. here we wont
		// worry about priority of empty filter since at the builder side (samplingBuilder.go)
		// we will prioritize empty filter at the end always.
		for _, c := range sc.Conditions {
			if !c.Default && len(c.FilterSet.Items) == 0 {
				return fmt.Errorf(fmt.Sprintf("rule (%s) has empty filter condition ", sc.Name))
			}
		}

	}

	return nil
}

// SamplingConfigByPriority implements sort.Interface for []SamplingConfig based on
// the priority.
type SamplingConfigByPriority []SamplingConfig

func (sp SamplingConfigByPriority) Len() int      { return len(sp) }
func (sp SamplingConfigByPriority) Swap(i, j int) { sp[i], sp[j] = sp[j], sp[i] }
func (sp SamplingConfigByPriority) Less(i, j int) bool {
	if sp[j].Default {
		// default priority always ranks highest
		return true
	}
	if sp[i].Default {
		// default priority always ranks highest
		return false
	}
	return sp[i].Priority < sp[j].Priority
}

// IngestionRulesByPriority implements sort.Interface for []IngestionRule based on
// the priority.
type IngestionRulesByPriority []IngestionRule

func (ip IngestionRulesByPriority) Len() int           { return len(ip) }
func (ip IngestionRulesByPriority) Swap(i, j int)      { ip[i], ip[j] = ip[j], ip[i] }
func (ip IngestionRulesByPriority) Less(i, j int) bool { return ip[i].Priority < ip[j].Priority }
