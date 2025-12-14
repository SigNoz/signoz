package authtypes

import (
	"net/http"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	typeUserSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeRoleSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeOrganizationSelectorRegex = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeResourceSelectorRegex     = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeResourcesSelectorRegex    = regexp.MustCompile(`^org:[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
)

type SelectorCallbackFn func(*http.Request) (Selector, []Selector, error)

type Selector struct {
	val string
}

func NewSelector(typed Type, selector string) (Selector, error) {
	switch typed {
	case TypeUser:
		if !typeUserSelectorRegex.MatchString(selector) {
			return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeUserSelectorRegex.String())
		}
	case TypeRole:
		if !typeRoleSelectorRegex.MatchString(selector) {
			return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeRoleSelectorRegex.String())
		}
	case TypeOrganization:
		if !typeOrganizationSelectorRegex.MatchString(selector) {
			return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeOrganizationSelectorRegex.String())
		}
	case TypeResource:
		if !typeResourceSelectorRegex.MatchString(selector) {
			return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeResourceSelectorRegex.String())
		}
	case TypeResources:
		if !typeResourcesSelectorRegex.MatchString(selector) {
			return Selector{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelectorRegex, "selector must conform to regex %s", typeResourcesSelectorRegex.String())
		}
	}

	return Selector{val: selector}, nil
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
