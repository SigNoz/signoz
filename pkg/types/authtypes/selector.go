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
	typeUserSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeRoleSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeOrganizationSelectorRegex = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeResourceSelectorRegex     = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeResourcesSelectorRegex    = regexp.MustCompile(`^org/[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
)

type SelectorCallbackFn func(context.Context, Claims) ([]Selector, error)

type Selector struct {
	val string
}

func NewSelector(typed Type, selector string) (Selector, error) {
	err := IsValidSelector(typed, Selector{val: selector})
	if err != nil {
		return Selector{}, err
	}

	return Selector{val: selector}, nil
}

func IsValidSelector(typed Type, selector Selector) error {
	switch typed {
	case TypeUser:
		if !typeUserSelectorRegex.MatchString(selector.String()) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeUserSelectorRegex.String())
		}
	case TypeRole:
		if !typeRoleSelectorRegex.MatchString(selector.String()) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeRoleSelectorRegex.String())
		}
	case TypeOrganization:
		if !typeOrganizationSelectorRegex.MatchString(selector.String()) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeOrganizationSelectorRegex.String())
		}
	case TypeResource:
		if !typeResourceSelectorRegex.MatchString(selector.String()) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeResourceSelectorRegex.String())
		}
	case TypeResources:
		if !typeResourcesSelectorRegex.MatchString(selector.String()) {
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
