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
// A query that is a valid `key OP value` filter compiles to the DSL predicate.
// A query made up entirely of bare words (a plain string, possibly with spaces)
// is a free-text search: a case-insensitive substring match against the
// dashboard name, description, and every tag key/value. A bare word mixed into a
// real filter, or any other malformed filter, is a validation error.
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
