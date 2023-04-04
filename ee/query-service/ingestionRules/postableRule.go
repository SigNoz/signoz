package ingestionRules

import (
	"fmt"

	"go.signoz.io/signoz/ee/query-service/model"
)

// PostableIngestionRules are a list of user defined ingestion rules
type PostableIngestionRules struct {
	Rules []PostableIngestionRule `json:"rules"`
}

// PostableIngestionRule captures user inputs in setting the ingestion rule
type PostableIngestionRule struct {
	Id          string                     `json:"id"`
	Name        string                     `json:"name"`
	Source      model.IngestionSource      `json:"source"`
	RuleType    model.IngestionRuleType    `json:"ruleType"`
	RuleSubType model.IngestionRuleSubtype `json:"ruleSubType"`
	Priority    int                        `json:"priority"`
	Config      *model.IngestionRuleConfig `json:"config"`
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

	if p.Config == nil {
		return model.BadRequestStr(fmt.Sprintf("invalid config found on rule: %s", p.Name))
	}

	return nil
}
