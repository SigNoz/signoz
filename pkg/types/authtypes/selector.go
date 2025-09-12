package authtypes

import (
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	typeUserSelectorRegex         = regexp.MustCompile("")
	typeRoleSelectorRegex         = regexp.MustCompile("")
	typeOrganizationSelectorRegex = regexp.MustCompile("")
	typeResourceSelectorRegex     = regexp.MustCompile("")
	typeResourcesSelectorRegex    = regexp.MustCompile("")
)

type Selector struct {
	val string
}

func NewSelector(typed Type, selector string) (Selector, error) {
	switch typed {
	case TypeUser:
		if !typeUserSelectorRegex.MatchString(selector) {
			return Selector{}, errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", typeUserSelectorRegex.String())
		}
	case TypeRole:
		if !typeRoleSelectorRegex.MatchString(selector) {
			return Selector{}, errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", typeRoleSelectorRegex.String())
		}
	case TypeOrganization:
		if !typeOrganizationSelectorRegex.MatchString(selector) {
			return Selector{}, errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", typeOrganizationSelectorRegex.String())
		}
	case TypeResource:
		if !typeResourceSelectorRegex.MatchString(selector) {
			return Selector{}, errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", typeResourceSelectorRegex.String())
		}
	case TypeResources:
		if !typeResourcesSelectorRegex.MatchString(selector) {
			return Selector{}, errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", typeResourcesSelectorRegex.String())
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
