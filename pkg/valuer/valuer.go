package valuer

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
)

type Valuer interface {
	IsZero() bool
	StringValue() string
	json.Marshaler
	json.Unmarshaler
	sql.Scanner
	driver.Valuer
}
