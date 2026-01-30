package types

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

// TextDuration preserves the human-readable duration text as provided by the input.
// It keeps the raw JSON bytes so serialization does not normalize values like
// "90m" into "1h30m0s".
type TextDuration struct {
	text  string
	value time.Duration
}

// NewTextDuration returns a TextDuration from a parsed duration value.
func NewTextDuration(d time.Duration) TextDuration {
	return TextDuration{value: d}
}

// ParseTextDuration parses a human-readable duration string.
// This preserves the raw text so that it can be serialized back to JSON.
func ParseTextDuration(s string) (TextDuration, error) {
	d, err := time.ParseDuration(s)
	if err != nil {
		return TextDuration{}, err
	}
	return TextDuration{text: s, value: d}, nil
}

// MustParseTextDuration parses a human-readable duration string, preserving
// the raw text and panics if an error occurs.
func MustParseTextDuration(s string) TextDuration {
	d, err := ParseTextDuration(s)
	if err != nil {
		panic(err)
	}
	return d
}

// Duration returns the [time.Duration] type.
func (d TextDuration) Duration() time.Duration {
	return d.value
}

// IsZero reports whether the parsed duration is zero.
func (d TextDuration) IsZero() bool {
	return d.value == 0
}

// String implements the fmt.Stringer interface.
func (d TextDuration) String() string {
	if len(d.text) > 0 {
		return d.text
	}
	return d.value.String()
}

// MarshalJSON serializes the duration value in a human-readable format (2h45m10s).
// If the raw text was provided, it is returned as-is. Example: 90m is not normalized to 1h30m0s.
func (d TextDuration) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

// UnmarshalJSON parses string or numeric durations.
func (d *TextDuration) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case float64:
		d.value = time.Duration(value)
		return nil
	case string:
		tmp, err := time.ParseDuration(value)
		if err != nil {
			return err
		}
		d.value = tmp
		d.text = value

		return nil
	default:
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid duration")
	}
}
