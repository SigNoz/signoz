package ingestionRules

import "go.signoz.io/signoz/ee/query-service/model"

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

	return nil
}
