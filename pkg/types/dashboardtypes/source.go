package dashboardtypes

import (
	"database/sql/driver"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func NewSource(source string) (Source, error) {
	candidate := Source{s: valuer.NewString(source)}
	if !candidate.IsValid() {
		return Source{}, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidSource, "invalid dashboard source %q, must be one of user, system, integration", source)
	}
	return candidate, nil
}
