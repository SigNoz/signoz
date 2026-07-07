package factory

import (
	"log/slog"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/swaggest/jsonschema-go"
)

var _ slog.LogValuer = (Name{})
var _ jsonschema.Exposer = (Name{})

var (
	// nameRegex is a regex that matches a valid name.
	// It must start with a alphabet, and can only contain alphabets, numbers, underscores or hyphens.
	nameRegex = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,30}$`)
)

type Name struct {
	name string
}

func (n Name) LogValue() slog.Value {
	return slog.StringValue(n.name)
}

func (n Name) String() string {
	return n.name
}

// MarshalText implements encoding.TextMarshaler for JSON serialization.
func (n Name) MarshalText() ([]byte, error) {
	return []byte(n.name), nil
}

// MarshalJSON implements json.Marshaler so Name serializes as a JSON string.
func (n Name) MarshalJSON() ([]byte, error) {
	return []byte(`"` + n.name + `"`), nil
}

// JSONSchema implements jsonschema.Exposer so OpenAPI reflects Name as a string.
func (n Name) JSONSchema() (jsonschema.Schema, error) {
	return *new(jsonschema.Schema).WithType(jsonschema.String.Type()), nil
}

// NewName creates a new name.
func NewName(name string) (Name, error) {
	if !nameRegex.MatchString(name) {
		return Name{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid factory name %q", name)
	}
	return Name{name: name}, nil
}

// MustNewName creates a new name.
// It panics if the name is invalid.
func MustNewName(name string) Name {
	n, err := NewName(name)
	if err != nil {
		panic(err)
	}
	return n
}
