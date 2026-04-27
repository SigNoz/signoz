package coretypes

import (
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var Types = []Type{
	TypeUser,
	TypeServiceAccount,
	TypeAnonymous,
	TypeRole,
	TypeOrganization,
	TypeMetaResource,
	TypeMetaResources,
}

var (
	ErrCodeInvalidType     = errors.MustNewCode("invalid_type")
	ErrCodeInvalidSelector = errors.MustNewCode("invalid_selector")
)

var (
	TypeUser           = Type{valuer.NewString("user"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeServiceAccount = Type{valuer.NewString("serviceaccount"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeAnonymous      = Type{valuer.NewString("anonymous"), regexp.MustCompile(`^\*$`), []Verb{}}
	TypeRole           = Type{valuer.NewString("role"), regexp.MustCompile(`^([a-z-]{1,50}|\*)$`), []Verb{VerbAssignee, VerbRead, VerbUpdate, VerbDelete}}
	TypeOrganization   = Type{valuer.NewString("organization"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeMetaResource   = Type{valuer.NewString("metaresource"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeMetaResources  = Type{valuer.NewString("metaresources"), regexp.MustCompile(`^\*$`), []Verb{VerbCreate, VerbList}}
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

// Equals reports whether two Type values name the same type. Type embeds a
// []Verb so the struct itself is not == comparable; callers compare via the
// embedded valuer.String, which is comparable.
func (typed Type) Equals(other Type) bool {
	return typed.String == other.String
}
