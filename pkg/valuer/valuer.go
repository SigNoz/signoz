package valuer

import (
	"database/sql"
	"database/sql/driver"
	"encoding"
	"encoding/json"
	"fmt"
)

type Valuer interface {
	// IsZero returns true if the value is considered empty or zero
	IsZero() bool

	// StringValue returns the string representation of the value
	StringValue() string

	// MarshalJSON returns the JSON encoding of the value.
	json.Marshaler

	// UnmarshalJSON returns the JSON decoding of the value.
	json.Unmarshaler

	// Scan into underlying struct from a database driver's value
	sql.Scanner

	// Convert the struct to a database driver's value
	driver.Valuer

	// Implement fmt.Stringer to allow the value to be printed as a string
	fmt.Stringer

	// Implement encoding.TextUnmarshaler to allow the value to be unmarshalled from a string
	encoding.TextUnmarshaler
}
