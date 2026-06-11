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
func Compile(query string, formatter sqlstore.SQLFormatter) (*Compiled, error) {
	if len(query) == 0 {
		return &Compiled{}, nil
	}

	queryVisitor := newVisitor(formatter)
	sql, args, syntaxErrs := queryVisitor.compile(query)

	if len(syntaxErrs) > 0 {
		return nil, errors.NewInvalidInputf(dashboardtypes.ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(syntaxErrs, "; "))
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
