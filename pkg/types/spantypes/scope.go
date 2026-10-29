package spantypes

import (
	"github.com/swaggest/jsonschema-go"
)

const (
	ScopeNameKey    = "scope.name"
	ScopeVersionKey = "scope.version"
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

// copyField copies one scope field key from src, resolved as the query builder does: scope.name and
// scope.version are the declared paths, any other name is a scope attribute.
func (s Scope) copyField(src Scope, name string) {
	switch name {
	case ScopeNameKey:
		if v, ok := src[scopeName]; ok {
			s[scopeName] = v
		}
	case ScopeVersionKey:
		if v, ok := src[scopeVersion]; ok {
			s[scopeVersion] = v
		}
	default:
		v, ok := src.attributes()[name]
		if !ok {
			return
		}
		attributes := s.attributes()
		if attributes == nil {
			attributes = make(map[string]any)
			s[scopeAttributes] = attributes
		}
		attributes[name] = v
	}
}

func (s Scope) attributes() map[string]any {
	attributes, _ := s[scopeAttributes].(map[string]any)
	return attributes
}
