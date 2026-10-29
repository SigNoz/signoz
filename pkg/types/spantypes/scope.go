package spantypes

import (
	"github.com/swaggest/jsonschema-go"
)

const (
	scopeName       = "name"
	scopeVersion    = "version"
	scopeAttributes = "attributes"
)

var _ jsonschema.Preparer = Scope{}

// Scope is a span's instrumentation scope holding only the fields that are set: name, version and
// attributes, a flat bag of dotted keys like the span attributes.
type Scope map[string]any

// NewScope builds a Scope from the flattened scope column, where an unset declared path reads back
// as its zero value (name and version as empty strings).
func NewScope(column map[string]any) Scope {
	scope := Scope{}
	if name, _ := column[scopeName].(string); name != "" {
		scope[scopeName] = name
	}
	if version, _ := column[scopeVersion].(string); version != "" {
		scope[scopeVersion] = version
	}
	if attributes, _ := column[scopeAttributes].(map[string]any); len(attributes) > 0 {
		scope[scopeAttributes] = attributes
	}
	return scope
}

// NewSelectedScope builds a Scope with only the selected fields from the flattened scope column:
// scope.name and scope.version select the declared paths, any other name a scope attribute.
func NewSelectedScope(column map[string]any, names []string) Scope {
	attributes, _ := column[scopeAttributes].(map[string]any)
	selected := map[string]any{}
	selectedAttributes := map[string]any{}
	for _, name := range names {
		switch name {
		case "scope.name":
			selected[scopeName] = column[scopeName]
		case "scope.version":
			selected[scopeVersion] = column[scopeVersion]
		default:
			if v, ok := attributes[name]; ok {
				selectedAttributes[name] = v
			}
		}
	}
	selected[scopeAttributes] = selectedAttributes
	return NewScope(selected)
}

// PrepareJSONSchema types the map's fields. Scope is a map rather than a struct so unset fields are
// left out instead of sent empty; omitempty would do that but decodes back with nil fields.
func (Scope) PrepareJSONSchema(schema *jsonschema.Schema) error {
	attributes := jsonschema.Schema{}
	attributes.WithType(jsonschema.Object.Type())
	attributes.WithAdditionalProperties(jsonschema.SchemaOrBool{TypeObject: &jsonschema.Schema{}})

	schema.AdditionalProperties = nil
	schema.WithPropertiesItem(scopeName, jsonschema.String.ToSchemaOrBool())
	schema.WithPropertiesItem(scopeVersion, jsonschema.String.ToSchemaOrBool())
	schema.WithPropertiesItem(scopeAttributes, attributes.ToSchemaOrBool())
	return nil
}
