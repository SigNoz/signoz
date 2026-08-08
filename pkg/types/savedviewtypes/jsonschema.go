package savedviewtypes

import (
	"github.com/swaggest/jsonschema-go"
)

var _ jsonschema.Preparer = (*SavedViewMetadataBase)(nil)

// PrepareJSONSchema restricts the published schemaVersion to the current
// contract value. SavedViewMetadataBase is embedded in SavedView,
// PostableSavedView and UpdatableSavedView, so this applies to all three
// through method promotion. Mirrors ruletypes.PostableRule's schemaVersion
// override -- v2, not ruletypes' v2alpha1.
func (SavedViewMetadataBase) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if prop, ok := schema.Properties["schemaVersion"]; ok && prop.TypeObject != nil {
		prop.TypeObject.WithEnum(SavedViewSchemaVersion)
	}

	return nil
}
