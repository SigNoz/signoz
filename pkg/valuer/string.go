package valuer

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

var _ Valuer = (*String)(nil)

type String struct {
	val string
}

func NewString(val string) String {
	return String{val: strings.ToLower(strings.TrimSpace(val))}
}

func (enum String) IsZero() bool {
	return enum.val == ""
}

func (enum String) StringValue() string {
	return enum.val
}

func (enum String) String() string {
	return enum.val
}

func (enum String) MarshalJSON() ([]byte, error) {
	return json.Marshal(enum.StringValue())
}

func (enum *String) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	*enum = NewString(str)
	return nil
}

func (enum String) Value() (driver.Value, error) {
	return enum.StringValue(), nil
}

func (enum *String) Scan(val interface{}) error {
	if enum == nil {
		return fmt.Errorf("string: (nil \"%s\")", reflect.TypeOf(enum).String())
	}

	if val == nil {
		// Return an empty string
		*enum = NewString("")
		return nil
	}

	str, ok := val.(string)
	if !ok {
		return fmt.Errorf("string: (non-string \"%s\")", reflect.TypeOf(val).String())
	}

	*enum = NewString(str)
	return nil
}
