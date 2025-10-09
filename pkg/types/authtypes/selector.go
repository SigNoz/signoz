package authtypes

import (
	"context"
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeAuthZInvalidSelectorRegex = errors.MustNewCode("authz_invalid_selector_regex")
)

var (
	_ json.Marshaler   = new(Selector)
	_ json.Unmarshaler = new(Selector)
)

var (
	typeUserSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeRoleSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeOrganizationSelectorRegex = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeResourceSelectorRegex     = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	// resources selectors are used to select either all or none
	typeResourcesSelectorRegex = regexp.MustCompile(`^\*$`)
)

type SelectorCallbackFn func(context.Context, Claims) ([]Selector, error)

type Selector struct {
	val string
}

func NewSelector(typed Type, selector string) (Selector, error) {
	err := IsValidSelector(typed, selector)
	if err != nil {
		return Selector{}, err
	}

	return Selector{val: selector}, nil
}

func IsValidSelector(typed Type, selector string) error {
	switch typed {
	case TypeUser:
		if !typeUserSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeUserSelectorRegex.String())
		}
	case TypeRole:
		if !typeRoleSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeRoleSelectorRegex.String())
		}
	case TypeOrganization:
		if !typeOrganizationSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeOrganizationSelectorRegex.String())
		}
	case TypeMetaResource:
		if !typeResourceSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeResourceSelectorRegex.String())
		}
	case TypeMetaResources:
		if !typeResourcesSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeResourcesSelectorRegex.String())
		}
	}

	return nil
}

func MustNewSelector(typed Type, input string) Selector {
	selector, err := NewSelector(typed, input)
	if err != nil {
		panic(err)
	}

	return selector
}

func (selector Selector) String() string {
	return selector.val
}

func (selector *Selector) MarshalJSON() ([]byte, error) {
	return json.Marshal(selector.val)
}

func (typed *Selector) UnmarshalJSON(data []byte) error {
	str := ""
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	shadow := Selector{val: str}
	*typed = shadow

	return nil
}
