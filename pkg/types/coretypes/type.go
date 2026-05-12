package coretypes

import (
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidType     = errors.MustNewCode("invalid_type")
	ErrCodeInvalidSelector = errors.MustNewCode("invalid_selector")
)

// Represents a type of entity in the system.
// These types are fundamental/core entities in the system.
type Type struct {
	valuer.String
	selectorRegex *regexp.Regexp
	allowedVerbs  []Verb
}

func NewType(input string) (Type, error) {
	switch input {
	case "user":
		return TypeUser, nil
	case "serviceaccount":
		return TypeServiceAccount, nil
	case "role":
		return TypeRole, nil
	case "organization":
		return TypeOrganization, nil
	case "metaresource":
		return TypeMetaResource, nil
	case "metaresources":
		return TypeMetaResources, nil
	default:
		return Type{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidType, "invalid type: %s", input)
	}
}

func MustNewType(input string) Type {
	typed, err := NewType(input)
	if err != nil {
		panic(err)
	}

	return typed
}

func ErrIfVerbNotValidForType(verb Verb, typed Type) error {
	if !typed.IsValidVerb(verb) {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidVerbForType, "verb %s is not valid for type %s", verb.StringValue(), typed.StringValue())
	}
	return nil
}

func (typed *Type) UnmarshalJSON(data []byte) error {
	str := ""
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	alias, err := NewType(str)
	if err != nil {
		return err
	}

	*typed = alias
	return nil
}

func (typed Type) Enum() []any {
	return []any{
		TypeUser,
		TypeServiceAccount,
		TypeAnonymous,
		TypeRole,
		TypeOrganization,
		TypeMetaResource,
		TypeMetaResources,
	}
}

func (typed Type) Selector(input string) (Selector, error) {
	if !typed.selectorRegex.MatchString(input) {
		return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidSelector, "invalid selector for type %s: %s", typed.StringValue(), input)
	}

	return Selector{val: input}, nil
}

func (typed Type) MustSelector(input string) Selector {
	selector, err := typed.Selector(input)
	if err != nil {
		panic(err)
	}

	return selector
}

func (typed Type) IsValidVerb(verb Verb) bool {
	for _, allowedVerb := range typed.allowedVerbs {
		if verb == allowedVerb {
			return true
		}
	}

	return false
}

func (typed Type) AllowedVerbs() []Verb {
	return typed.allowedVerbs
}

func (typed Type) Equals(other Type) bool {
	return typed.String == other.String
}
