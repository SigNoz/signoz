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
	Name       string         `json:"name" required:"true"`
	Version    string         `json:"version" required:"true"`
	Attributes map[string]any `json:"attributes" required:"true" nullable:"false"`
}

func NewScope(column telemetrystoretypes.JSONValue) Scope {
	return Scope{
		Name:       column.StringAt("name"),
		Version:    column.StringAt("version"),
		Attributes: column.ObjectAt("attributes").Flatten(),
	}
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
