package valuer

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
)

var _ Valuer = (*DisplayName)(nil)

var cloneCopySuffixRegex = regexp.MustCompile(`^(.*) - Copy(?: \((\d+)\))?$`)

// DisplayName is a free-text, user-facing name; unlike String it is stored exactly as given.
type DisplayName struct {
	val string
}

func NewDisplayName(val string) DisplayName {
	return DisplayName{val: val}
}

func (name DisplayName) IsZero() bool {
	return name.val == ""
}

func (name DisplayName) StringValue() string {
	return name.val
}

func (name DisplayName) String() string {
	return name.val
}

// GenerateCloneName appends " - Copy" or bumps an existing " - Copy (n)" counter.
func (name DisplayName) GenerateCloneName() DisplayName {
	base, count := name.val, 0
	if m := cloneCopySuffixRegex.FindStringSubmatch(name.val); m != nil {
		base = m[1]
		count = 1 // bare " - Copy"
		if m[2] != "" {
			count, _ = strconv.Atoi(m[2])
		}
	}

	if count++; count > 1 {
		return NewDisplayName(fmt.Sprintf("%s - Copy (%d)", base, count))
	}
	return NewDisplayName(fmt.Sprintf("%s - Copy", base))
}

func (name DisplayName) MarshalJSON() ([]byte, error) {
	return json.Marshal(name.val)
}

// UnmarshalJSON treats null as a no-op, matching how a plain string field decodes.
func (name *DisplayName) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	*name = NewDisplayName(str)
	return nil
}

func (name DisplayName) Value() (driver.Value, error) {
	return name.val, nil
}

func (name *DisplayName) Scan(val any) error {
	if name == nil {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "display name: (nil \"%s\")", reflect.TypeOf(name).String())
	}

	if val == nil {
		*name = NewDisplayName("")
		return nil
	}

	str, ok := val.(string)
	if !ok {
		return errors.Newf(errors.TypeInternal, ErrCodeUnknownValuerScan, "display name: (non-string \"%s\")", reflect.TypeOf(val).String())
	}

	*name = NewDisplayName(str)
	return nil
}

func (name *DisplayName) UnmarshalText(text []byte) error {
	*name = NewDisplayName(string(text))
	return nil
}

func (name DisplayName) MarshalText() ([]byte, error) {
	return []byte(name.val), nil
}

func (name *DisplayName) UnmarshalParam(param string) error {
	*name = NewDisplayName(param)
	return nil
}
