package sqlrulestore

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

type Compiled struct {
	SQL  string
	Args []any
}

func (c Compiled) IsEmpty() bool {
	return c.SQL == ""
}

// Compile on success returns a non-nil *Compiled; an empty query (or one
// producing no SQL) yields an empty SQL — callers gate on IsEmpty, not nil.
func Compile(query string, formatter sqlstore.SQLFormatter) (*Compiled, error) {
	if len(strings.TrimSpace(query)) == 0 {
		return &Compiled{}, nil
	}

	sql, args, errs := newVisitor(formatter).compile(query)
	if len(errs) > 0 {
		return nil, errors.NewInvalidInputf(ruletypes.ErrCodeRuleListFilterInvalid,
			"invalid filter query: %s", strings.Join(errs, "; "))
	}

	return &Compiled{
		SQL:  sql,
		Args: args,
	}, nil
}
