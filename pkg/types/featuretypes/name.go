package featuretypes

import (
	"fmt"
	"regexp"
)

var (
	nameRegex = regexp.MustCompile(`^[a-z][a-z0-9_]+$`)
)

type Name struct {
	s string
}

func NewName(s string) (Name, error) {
	if !nameRegex.MatchString(s) {
		return Name{}, fmt.Errorf("invalid feature name: %s", s)
	}

	return Name{s: s}, nil
}

func MustNewName(s string) Name {
	name, err := NewName(s)
	if err != nil {
		panic(err)
	}

	return name
}

func (n Name) String() string {
	return n.s
}
