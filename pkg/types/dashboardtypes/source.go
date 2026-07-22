package dashboardtypes

import (
	"database/sql/driver"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

type Source struct {
	s valuer.String
}

var (
	SourceUser        = Source{s: valuer.NewString("user")}
	SourceSystem      = Source{s: valuer.NewString("system")}
	SourceIntegration = Source{s: valuer.NewString("integration")}
)

func (Source) Enum() []any {
	return []any{SourceUser, SourceSystem, SourceIntegration}
}

// JSONSchema exposes Source as a string enum. Without this the reflector sees the
// unexported valuer.String field and emits `type: object`. The enum values are
// derived from Enum() so the list of sources lives in exactly one place.
func (Source) JSONSchema() (jsonschema.Schema, error) {
	sources := Source{}.Enum()
	enum := make([]any, 0, len(sources))
	for _, source := range sources {
		enum = append(enum, source.(Source).StringValue())
	}

	schema := jsonschema.Schema{}
	schema.WithType(jsonschema.String.Type())
	schema.WithEnum(enum...)

	return schema, nil
}

func (s Source) IsValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}

func (s Source) IsZero() bool { return s.s.IsZero() }

func (s Source) String() string { return s.s.String() }

func (s Source) StringValue() string { return s.s.StringValue() }

func (s Source) Value() (driver.Value, error) {
	if !s.IsValid() {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidSource, "invalid dashboard source %q, must be one of user, system, integration", s.s.StringValue())
	}
	return s.s.Value()
}

func (s *Source) Scan(src any) error {
	return s.s.Scan(src)
}

func (s Source) MarshalJSON() ([]byte, error) {
	return s.s.MarshalJSON()
}

func (s *Source) UnmarshalJSON(data []byte) error {
	return s.s.UnmarshalJSON(data)
}

func (s Source) isUserDeletable() bool {
	return s == SourceUser
}

func (s Source) isClonable() bool {
	return s == SourceUser || s == SourceIntegration
}

func NewSource(source string) (Source, error) {
	candidate := Source{s: valuer.NewString(source)}
	if !candidate.IsValid() {
		return Source{}, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidSource, "invalid dashboard source %q, must be one of user, system, integration", source)
	}
	return candidate, nil
}
