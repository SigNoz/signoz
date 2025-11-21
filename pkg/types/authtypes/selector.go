package authtypes

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeAuthZInvalidSelector = errors.MustNewCode("authz_invalid_selector")
)

var (
	_ json.Marshaler   = new(Selector)
	_ json.Unmarshaler = new(Selector)
)

var (
	typeUserSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeRoleSelectorRegex         = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeAnonymousSelectorRegex    = regexp.MustCompile(`^\*$`)
	typeOrganizationSelectorRegex = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	typeMetaResourceSelectorRegex = regexp.MustCompile(`^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$`)
	// metaresources selectors are used to select either all or none
	typeMetaResourcesSelectorRegex = regexp.MustCompile(`^\*$`)
)

type SelectorCallbackWithClaimsFn func(*http.Request, Claims) ([]Selector, error)
type SelectorCallbackWithoutClaimsFn func(*http.Request, []*types.Organization) ([]Selector, valuer.UUID, error)

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

func MustNewSelector(typed Type, input string) Selector {
	selector, err := NewSelector(typed, input)
	if err != nil {
		panic(err)
	}

	return selector
}

func (selector *Selector) MarshalJSON() ([]byte, error) {
	return json.Marshal(selector.val)
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

	alias := Selector{val: str}
	*typed = alias

	return nil
}

func IsValidSelector(typed Type, selector string) error {
	switch typed {
	case TypeUser:
		if !typeUserSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeUserSelectorRegex.String())
		}
		return nil
	case TypeRole:
		if !typeRoleSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeRoleSelectorRegex.String())
		}
		return nil
	case TypeAnonymous:
		if !typeAnonymousSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeAnonymousSelectorRegex.String())
		}
		return nil
	case TypeOrganization:
		if !typeOrganizationSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeOrganizationSelectorRegex.String())
		}
		return nil
	case TypeMetaResource:
		if !typeMetaResourceSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeMetaResourceSelectorRegex.String())
		}
		return nil
	case TypeMetaResources:
		if !typeMetaResourcesSelectorRegex.MatchString(selector) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidSelector, "selector must conform to regex %s", typeMetaResourcesSelectorRegex.String())
		}
		return nil
	}

	return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidType, "invalid type: %s", typed)
}
