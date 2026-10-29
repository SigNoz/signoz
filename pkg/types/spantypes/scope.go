package spantypes

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

const (
	ScopeNameKey    = "scope.name"
	ScopeVersionKey = "scope.version"
)

// Scope is a span's instrumentation scope. Attributes are flat dotted keys, like the span attributes.
type Scope struct {
	Name       string         `json:"name,omitempty"`
	Version    string         `json:"version,omitempty"`
	Attributes map[string]any `json:"attributes,omitempty"`
}

func NewScope(column telemetrystoretypes.JSONValue) Scope {
	scope := newEmptyScope()
	fields := column.Flatten()
	scope.Name, _ = fields["name"].(string)
	scope.Version, _ = fields["version"].(string)
	if attributes, ok := fields["attributes"].(map[string]any); ok {
		scope.Attributes = attributes
	}
	return scope
}

func newEmptyScope() Scope {
	return Scope{Attributes: make(map[string]any)}
}

// copyField copies one scope field key from src, resolved as the query builder does: scope.name and
// scope.version are the declared paths, any other name is a scope attribute.
func (s *Scope) copyField(src Scope, name string) {
	switch name {
	case ScopeNameKey:
		s.Name = src.Name
	case ScopeVersionKey:
		s.Version = src.Version
	default:
		if v, ok := src.Attributes[name]; ok {
			s.Attributes[name] = v
		}
	}
}
