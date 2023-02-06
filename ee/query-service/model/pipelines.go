package model

import (
	"encoding/json"

	"github.com/pkg/errors"
)

// IngestionRule is stored and also deployed finally to collector config
type Pipeline struct {
	Id      string `json:"id,omitempty" db:"id"`
	OrderId string `json:"orderId" db:"order_id"`
	Name    string `json:"name,omitempty" db:"name"`
	Alias   string `json:"alias" db:"alias"`
	Enabled bool   `json:"enabled" db:"enabled"`
	Filter  string `json:"filter" db:"filter"`
	// configuration for pipeline
	RawConfig string `db:"config_json"`

	Config []PipelineOperatos `json:"config"`

	Creator
	Updater

	DeploymentStatus   string `db:"deployment_status"`
	DeploymentSequence string `db:"deployment_sequence"`
}

type PipelineOperatos struct {
	Type      string           `json:"type" yaml:"type"`
	ParseTo   string           `json:"parse_to,omitempty" yaml:"parse_to,omitempty"`
	Pattern   string           `json:"pattern,omitempty" yaml:"pattern,omitempty"`
	Output    string           `json:"output,omitempty" yaml:"output,omitempty"`
	Regex     string           `json:"regex,omitempty" yaml:"regex,omitempty"`
	ID        string           `json:"id,omitempty" yaml:"id,omitempty"`
	ParseFrom string           `json:"parse_from,omitempty" yaml:"parse_from,omitempty"`
	Timestamp *TimestampParser `json:"timestamp,omitempty" yaml:"timestamp,omitempty"`
	Field     string           `json:"field,omitempty" yaml:"field,omitempty"`
	Value     string           `json:"value,omitempty" yaml:"value,omitempty"`
	From      string           `json:"from,omitempty"`
	To        string           `json:"to,omitempty"`
}

type TimestampParser struct {
	Layout     string `json:"layout"`
	LayoutType string `json:"layout_type"`
	ParseFrom  string `json:"parse_from"`
}

func (i *Pipeline) ParseRawConfig() error {
	c := []PipelineOperatos{}
	err := json.Unmarshal([]byte(i.RawConfig), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = c
	return nil
}

// // DropConfig configuration for dropping metrics, logs or traces record
// type DropConfig struct {
// 	// identifies filters for this drop rule
// 	FilterSet basemodel.FilterSet `json:"filterSet"`
// }

// // PrepareExpression prepares an OTTL expression that can be passed to
// // filter processor.
// func (d *DropConfig) PrepareExpression() (result string, fnerr error) {

// 	// holds a list of expressions
// 	var exprs []string

// 	for _, i := range d.FilterSet.Items {
// 		var expr string
// 		switch i.KeyType {
// 		case MetricName:
// 			// todo(amol): may need to transform operator to OTTL
// 			// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md#boolean-expressions
// 			expr = fmt.Sprintf("name %s \"%s\"", i.Operator, i.Value)
// 		case ResourceAttribute:
// 			expr = fmt.Sprintf("resource.attributes[\"%s\"] %s \"%s\"", i.Key, i.Operator, i.Value)
// 		case Label:
// 			expr = fmt.Sprintf("attributes[\"%s\"] %s \"%s\"", i.Key, i.Operator, i.Value)
// 		}
// 		if expr != "" {
// 			exprs = append(exprs, expr)
// 		}
// 	}

// 	if len(exprs) == 0 {
// 		return
// 	}

// 	result = exprs[0]

// 	for _, e := range exprs[1:] {
// 		result += fmt.Sprintf(" %s %s", d.FilterSet.Operator, e)
// 	}
// 	return
// }

// type SamplingMethod string

// const (
// 	// allows probabilistic dropping of ingested record to meet
// 	// a storage objective
// 	SamplingMethodProbabilistic = "probabilistic"

// 	// ensures the ingested records that match a the filter are always
// 	// included in sampled data
// 	SamplingMethodIncludeAll = "include_all"
// )

// SamplingConfig defines a sampling strategy rule
// type SamplingConfig struct {
// 	ID   string `json:"id"`
// 	Name string `json:"name"`

// 	// Set to true for sampling rule (root) and false for conditions
// 	Root bool `json:"root"`

// 	Priority int `json:"priority"`

// 	// filter conditions
// 	FilterSet basemodel.FilterSet `json:"filterSet"`

// 	SamplingMethod  SamplingMethod `json:"samplingMethod"`
// 	SamplingPercent int            `json:"samplingPercent"`

// 	// each rule supports multiple condition filters
// 	// with their own sampling method and percent.
// 	// This is expected to be just one level deep structure.
// 	// e.g This rule will retain all audit logs with threat=true
// 	// and sample remaining records using prabilistic sampling (50%)
// 	// root 	(source: audit)
// 	// 		condition	(threat: true)				IncludeAll	100%
// 	//		condition	(no filter set)  Default	Probabilistic 50%
// 	Conditions []SamplingConfig `json:"conditions"`

// 	// Default would identify capture-all case. The conditions or rules
// 	// with default flag (true) will always have least priority and
// 	// no filters.
// 	Default bool
// }

// Valid checks the validity of a sampling rule and its conditions
// func (sc *SamplingConfig) Valid() error {
// 	if sc.Root {
// 		if sc.Name == "" {
// 			return fmt.Errorf("name is required for all sampling rules")
// 		}

// 		if !sc.Default && len(sc.FilterSet.Items) != 1 {
// 			// non-default rule has no filter set, raise an error
// 			return fmt.Errorf(fmt.Sprintf("invalid filter for sampling rule (%s)", sc.Name))
// 		}

// 		// go through conditions and ensure only on empty filter exists. here we wont
// 		// worry about priority of empty filter since at the builder side (samplingBuilder.go)
// 		// we will prioritize empty filter at the end always.
// 		for _, c := range sc.Conditions {
// 			if !c.Default && len(c.FilterSet.Items) == 0 {
// 				return fmt.Errorf(fmt.Sprintf("rule (%s) has empty filter condition ", sc.Name))
// 			}
// 		}

// 	}
// 	return nil
// }

// SamplingConfigByPriority implements sort.Interface for []SamplingConfig based on
// the priority.
// type SamplingConfigByPriority []SamplingConfig

// func (sp SamplingConfigByPriority) Len() int      { return len(sp) }
// func (sp SamplingConfigByPriority) Swap(i, j int) { sp[i], sp[j] = sp[j], sp[i] }
// func (sp SamplingConfigByPriority) Less(i, j int) bool {
// 	if sp[j].Default {
// 		// default priority always ranks highest
// 		return true
// 	}
// 	if sp[i].Default {
// 		// default priority always ranks highest
// 		return false
// 	}
// 	return sp[i].Priority < sp[j].Priority
// }

// // IngestionRulesByPriority implements sort.Interface for []IngestionRule based on
// // the priority.
// type IngestionRulesByPriority []IngestionRule

// func (ip IngestionRulesByPriority) Len() int           { return len(ip) }
// func (ip IngestionRulesByPriority) Swap(i, j int)      { ip[i], ip[j] = ip[j], ip[i] }
// func (ip IngestionRulesByPriority) Less(i, j int) bool { return ip[i].Priority < ip[j].Priority }
