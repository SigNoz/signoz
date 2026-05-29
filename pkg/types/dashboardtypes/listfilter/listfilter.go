package listfilter

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type Compiled struct {
	SQL  string
	Args []any
}

func Compile(query string, formatter sqlstore.SQLFormatter) (*Compiled, error) {
	if len(query) == 0 {
		return nil, nil
	}

	queryVisitor := newVisitor(formatter)
	frag, syntaxErrs := queryVisitor.compile(query)

	if len(syntaxErrs) > 0 {
		return nil, errors.NewInvalidInputf(ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(syntaxErrs, "; "))
	}
	if len(queryVisitor.errors) > 0 {
		return nil, errors.NewInvalidInputf(ErrCodeDashboardListFilterInvalid,
			"invalid filter query: %s", strings.Join(queryVisitor.errors, "; "))
	}
	if frag == nil || frag.sql == "" {
		return nil, nil
	}

	return &Compiled{
		SQL:  frag.sql,
		Args: frag.args,
	}, nil
}
