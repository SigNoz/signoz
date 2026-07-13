package impldashboard

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

type Compiled struct {
	SQL  string
	Args []any
}

func (c Compiled) IsEmpty() bool {
	return c.SQL == ""
}

// Compile always returns a non-nil *Compiled. An empty query (or one that
// produces no SQL) yields a Compiled with an empty SQL — callers gate on
// SQL != "" rather than a nil check.
//
// A `key OP value` term compiles to a DSL predicate; a bare word is a
// case-insensitive substring search over the dashboard name, description, and tag
// keys/values. They compose through AND/OR/NOT, so `prod payment` matches both
// words (implicit AND) and `prod OR name = 'x'` mixes free text with a filter. A
// quoted token matches literally, e.g. `"prod payment"`.
func Compile(query string, formatter sqlstore.SQLFormatter) (*Compiled, error) {
	if len(strings.TrimSpace(query)) == 0 {
		return &Compiled{}, nil
	}

	sql, args, errs := newVisitor(formatter).compile(query)
	if len(errs) > 0 {
		return nil, errors.NewInvalidInputf(dashboardtypes.ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(errs, "; "))
	}

	return &Compiled{
		SQL:  sql,
		Args: args,
	}, nil
}
