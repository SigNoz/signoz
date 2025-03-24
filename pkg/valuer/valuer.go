package valuer

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
)

type Valuer interface {
	// IsZero returns true if the value is considered empty or zero
	IsZero() bool
	// StringValue returns the string representation of the value
	StringValue() string
	// Convert to json marshalled value from the struct
	json.Marshaler
	// Unmarshal into struct from underlying json marshalled value
	json.Unmarshaler
	// Scan into underlying struct from a database driver's value
	sql.Scanner
	// Convert the struct to a database driver's value
	driver.Valuer
}
