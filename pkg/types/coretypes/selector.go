package coretypes

import "encoding/json"

const (
	WildCardSelectorString string = "*"
)

type Selector struct {
	val string
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

func (selector Selector) MarshalText() ([]byte, error) {
	return []byte(selector.val), nil
}

func (selector *Selector) UnmarshalText(text []byte) error {
	*selector = Selector{val: string(text)}
	return nil
}
