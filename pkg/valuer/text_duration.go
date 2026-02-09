package valuer

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

var _ Valuer = (*TextDuration)(nil)

// TextDuration preserves the human-readable duration text as provided by the input.
// It keeps the raw JSON bytes so serialization does not normalize values like
// "90m" into "1h30m0s".
type TextDuration struct {
	text  string
	value time.Duration
}

// ParseTextDuration parses a human-readable duration string.
// This preserves the raw text so that it can be serialized back to JSON.
func ParseTextDuration(s string) (TextDuration, error) {
	d, err := time.ParseDuration(s)
	if err != nil {
		return TextDuration{}, errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse duration text")
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

// IsZero implements [Valuer].
// It returns whether the parsed duration is zero.
func (d TextDuration) IsZero() bool {
	return d.value == 0
}

// IsPositive whether the duration is greater than zero.
func (d TextDuration) IsPositive() bool {
	return d.value > 0
}

// String implements the [fmt.Stringer] interface.
func (d TextDuration) String() string {
	if len(d.text) > 0 {
		return d.text
	}
	return d.value.String()
}

// StringValue implements [Valuer].
func (d TextDuration) StringValue() string {
	return d.String()
}

// MarshalJSON implements the [encoding/json.Marshaler] interface.
// It serializes the duration value in a human-readable format (1h30m0s).
// If the original text is available, it is returned as-is. Example: 90m is not normalized to 1h30m0s.
func (d TextDuration) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

// UnmarshalJSON implements the [encoding/json.Unmarshaler] interface.
// It parses string or numeric durations, and stores the string representation.
func (d *TextDuration) UnmarshalJSON(b []byte) error {
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		return errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid duration")
	}
	switch value := v.(type) {
	case float64:
		d.value = time.Duration(value)
		d.text = ""
		return nil

	case string:
		tmp, err := time.ParseDuration(value)
		if err != nil {
			return errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid duration")
		}
		d.value = tmp
		d.text = value
		return nil

	default:
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid duration")
	}
}

// MarshalText implements [encoding.TextMarshaler].
func (d TextDuration) MarshalText() ([]byte, error) {
	return []byte(d.String()), nil
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (d *TextDuration) UnmarshalText(text []byte) error {
	s := string(text)
	tmp, err := time.ParseDuration(s)
	if err != nil {
		return errors.Wrap(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse duration text")
	}
	d.value = tmp
	d.text = s
	return nil
}

// Value implements [driver.Valuer] by delegating to the underlying duration.
func (d TextDuration) Value() (driver.Value, error) {
	return d.String(), nil
}

// Scan implements [database/sql.Scanner] to read the duration from the database.
func (d *TextDuration) Scan(value any) error {
	if value == nil {
		d.value = 0
		d.text = ""
		return nil
	}

	switch v := value.(type) {
	case int64:
		d.value = time.Duration(v)
		d.text = ""
		return nil
	case []byte:
		return d.UnmarshalText(v)
	case string:
		return d.UnmarshalText([]byte(v))
	default:
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput,
			"cannot scan type %T into TextDuration", value)
	}
}

func (d *TextDuration) UnmarshalParam(param string) error {
	return d.UnmarshalText([]byte(param))
}

// Equal reports the two TextDuration represent the same underlying duration values.
//
// Note that the String representations for them can be different.
func (d TextDuration) Equal(d2 TextDuration) bool {
	return d.value == d2.value
}

// Milliseconds returns the duration as an integer millisecond count.
func (d TextDuration) Milliseconds() int64 {
	return d.value.Milliseconds()
}
