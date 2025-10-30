package ruletypes

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

const (
	CriticalThresholdName = "CRITICAL"
	LabelThresholdName    = "threshold.name"
	LabelRuleId           = "ruleId"

	// Rule attribute key constants for search and filtering
	RuleAttributeKeyCreatedBy     = "created_by"
	RuleAttributeKeyUpdatedBy     = "updated_by"
	RuleAttributeKeyName          = "name"
	RuleAttributeKeyThresholdName = "threshold.name"
	RuleAttributeKeyChannel       = "channel"
	RuleAttributeKeyPolicy        = "policy"
	RuleAttributeKeyRuleType      = "type"
	RuleAttributeKeyLabel         = "label"
)

var (
	FixedRuleAttributeKeys = []GetRuleAttributeKeys{
		{Key: RuleAttributeKeyCreatedBy, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyUpdatedBy, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyName, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyThresholdName, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyChannel, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyPolicy, DataType: telemetrytypes.FieldDataTypeBool, Type: RuleAttributeTypeFixed},
		{Key: RuleAttributeKeyRuleType, DataType: telemetrytypes.FieldDataTypeString, Type: RuleAttributeTypeFixed},
	}
)
