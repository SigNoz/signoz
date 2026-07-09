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

	queryVisitor := newVisitor(formatter)
	sql, args, syntaxErrs := queryVisitor.compile(query)

	if len(syntaxErrs) > 0 {
		return nil, errors.NewInvalidInputf(dashboardtypes.ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(syntaxErrs, "; "))
	}

	// The query parsed into nothing but bare terms — treat it as a free-text search.
	if sql == "" && len(queryVisitor.errors) == 0 && len(queryVisitor.bareTerms) > 0 {
		value := strings.TrimSpace(query)
		// A query that is a single quoted string searches for its contents
		// literally — the escape hatch for terms that would otherwise parse as DSL.
		if len(queryVisitor.bareTerms) == 1 && queryVisitor.bareTerms[0] == value {
			value = trimQuotes(value)
		}
		freeTextVisitor := newVisitor(formatter)
		freeSQL, freeArgs := freeTextVisitor.compileFreeText(value)
		return &Compiled{
			SQL:  freeSQL,
			Args: freeArgs,
		}, nil
	}

	// A bare term alongside a real comparison is not valid DSL.
	for _, bareTerm := range queryVisitor.bareTerms {
		queryVisitor.addError("unsupported expression %q — every term must be of the form `key OP value`", bareTerm)
	}
	if len(queryVisitor.errors) > 0 {
		return nil, errors.NewInvalidInputf(dashboardtypes.ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(queryVisitor.errors, "; "))
	}

	return &Compiled{
		SQL:  sql,
		Args: args,
	}, nil
}
