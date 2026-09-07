package valuer

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

var _ Valuer = (*UnsetOrNonEmptyString)(nil)

// UnsetOrNonEmptyString separates a field left out of the input from one
// explicitly set to "". Decoding rejects "", and json calls UnmarshalJSON only
// for a field that is present, so a field holding "" is a field nobody set.
type UnsetOrNonEmptyString struct {
	val string
}

func NewUnsetOrNonEmptyString(val string) (UnsetOrNonEmptyString, error) {
	if val == "" {
		return UnsetOrNonEmptyString{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidValuer, "string must not be empty")
	}

	return UnsetOrNonEmptyString{val: val}, nil
}

func MustNewUnsetOrNonEmptyString(val string) UnsetOrNonEmptyString {
	nonEmptyString, err := NewUnsetOrNonEmptyString(val)
	if err != nil {
		panic(err)
	}

	return nonEmptyString
}

func (enum UnsetOrNonEmptyString) IsZero() bool {
	return enum.val == ""
}

func (enum UnsetOrNonEmptyString) StringValue() string {
	return enum.val
}

func (enum UnsetOrNonEmptyString) String() string {
	return enum.val
}

func (enum UnsetOrNonEmptyString) MarshalJSON() ([]byte, error) {
	return json.Marshal(enum.StringValue())
}

func (enum *UnsetOrNonEmptyString) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	var err error
	*enum, err = NewUnsetOrNonEmptyString(str)
	if err != nil {
		return err
	}

	return nil
}

func (enum UnsetOrNonEmptyString) Value() (driver.Value, error) {
	return enum.StringValue(), nil
}

func (enum *UnsetOrNonEmptyString) Scan(val any) error {
	if enum == nil {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "unset_or_non_empty_string: (nil \"%T\")", enum)
	}

	str, ok := val.(string)
	if !ok {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "unset_or_non_empty_string: (non-string \"%T\")", val)
	}

	var err error
	*enum, err = NewUnsetOrNonEmptyString(str)
	if err != nil {
		return err
	}

	return nil
}

func (enum *UnsetOrNonEmptyString) UnmarshalText(text []byte) error {
	var err error
	*enum, err = NewUnsetOrNonEmptyString(string(text))
	if err != nil {
		return err
	}

	return nil
}

func (enum UnsetOrNonEmptyString) MarshalText() (text []byte, err error) {
	return []byte(enum.StringValue()), nil
}

func (enum *UnsetOrNonEmptyString) UnmarshalParam(param string) error {
	nonEmptyString, err := NewUnsetOrNonEmptyString(param)
	if err != nil {
		return err
	}

	*enum = nonEmptyString

	return nil
}
