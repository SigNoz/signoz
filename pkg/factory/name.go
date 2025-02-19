package factory

import (
	"fmt"
	"log/slog"
	"regexp"
)

var _ slog.LogValuer = (Name{})

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

// NewName creates a new name.
func NewName(name string) (Name, error) {
	if !nameRegex.MatchString(name) {
		return Name{}, fmt.Errorf("invalid factory name %q", name)
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
