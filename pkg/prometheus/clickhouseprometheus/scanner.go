package clickhouseprometheus

import (
	"database/sql"
	"fmt"
)

var _ sql.Scanner = (*scanner)(nil)

type scanner struct {
	f float64
	s string
}

func (s *scanner) Scan(val any) error {
	s.f = 0
	s.s = ""

	s.s = fmt.Sprintf("%v", val)
	switch val := val.(type) {
	case int64:
		s.f = float64(val)
	case uint64:
		s.f = float64(val)
	case float64:
		s.f = val
	case []byte:
		s.s = string(val)
	}
	return nil
}
