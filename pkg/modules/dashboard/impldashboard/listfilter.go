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

func Compile(query string, formatter sqlstore.SQLFormatter) (*Compiled, error) {
	if len(query) == 0 {
		return nil, nil //nolint:nilnil
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
	if sql == "" {
		return nil, nil //nolint:nilnil
	}

	return &Compiled{
		SQL:  sql,
		Args: args,
	}, nil
}
