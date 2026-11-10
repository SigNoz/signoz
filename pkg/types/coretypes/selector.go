package coretypes

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	WildCardSelectorString string = "*"
)

var errCodeInvalidResourceID = errors.MustNewCode("invalid_resource_id")

var WildcardSelector SelectorFunc = func(_ context.Context, resource Resource, _ string, _ valuer.UUID) ([]Selector, error) {
	return []Selector{resource.Type().MustSelector(WildCardSelectorString)}, nil
}

var IDSelector SelectorFunc = func(_ context.Context, resource Resource, id string, _ valuer.UUID) ([]Selector, error) {
	if id == "" {
		return nil, errors.Newf(
			errors.TypeInvalidInput,
			errCodeInvalidResourceID,
			"resource id is required for %s",
			resource.Kind().String(),
		)
	}

	selector, err := resource.Type().Selector(id)
	if err != nil {
		return nil, err
	}

	return []Selector{selector, resource.Type().MustSelector(WildCardSelectorString)}, nil
}

type Selector struct {
	val string
}

// SelectorFunc maps a resolved id (+ its resource) to authz FGA selectors.
type SelectorFunc func(ctx context.Context, resource Resource, id string, orgID valuer.UUID) ([]Selector, error)

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

func (selector Selector) MarshalText() ([]byte, error) {
	return []byte(selector.val), nil
}

func (selector *Selector) UnmarshalText(text []byte) error {
	*selector = Selector{val: string(text)}
	return nil
}
