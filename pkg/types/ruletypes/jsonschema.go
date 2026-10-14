package ruletypes

import (
	"github.com/swaggest/jsonschema-go"
)

var (
	_ jsonschema.Preparer = (*PostableRule)(nil)
	_ jsonschema.Preparer = (*RuleCondition)(nil)
)

// PrepareJSONSchema restricts the published rule schema to the v2alpha1
// contract: the v1-only fields (evalWindow, frequency, preferredChannels) and
// the query version (always "v5", defaulted by the server) are omitted, and
// the fields the server requires for schemaVersion v2alpha1 are marked
// required. Runtime JSON handling is unchanged and continues to load stored
// v1 rules until schemaVersion v1 is removed.
//
// Rule and GettableRule embed PostableRule, so this also applies to the
// published read models through method promotion.
func (r *PostableRule) PrepareJSONSchema(schema *jsonschema.Schema) error {
	for _, name := range []string{"evalWindow", "frequency", "preferredChannels", "version", "source"} {
		delete(schema.Properties, name)
	}

	schema.Required = append(schema.Required, "schemaVersion", "evaluation", "notificationSettings")

	if prop, ok := schema.Properties["schemaVersion"]; ok && prop.TypeObject != nil {
		prop.TypeObject.WithEnum(SchemaVersionV2Alpha1)
	}

	return nil
}

// PrepareJSONSchema removes the v1-only condition fields (target, op,
// matchType, targetUnit — expressed per threshold entry in v2alpha1) from the
// published schema and marks thresholds and selectedQueryName required.
func (rc *RuleCondition) PrepareJSONSchema(schema *jsonschema.Schema) error {
	for _, name := range []string{"target", "op", "matchType", "targetUnit"} {
		delete(schema.Properties, name)
	}

	schema.Required = append(schema.Required, "thresholds", "selectedQueryName")

	return nil
}
