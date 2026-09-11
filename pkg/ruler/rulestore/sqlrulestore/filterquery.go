package sqlrulestore

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/parser/filterquery/sqlcompiler"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// Compile wraps compiler errors in the rules list filter error code.
func Compile(query string, formatter sqlstore.SQLFormatter) (*sqlcompiler.Compiled, error) {
	compiled, errs := sqlcompiler.Compile(query, formatter, ruleFieldResolver{})
	if len(errs) > 0 {
		return nil, errors.NewInvalidInputf(ruletypes.ErrCodeRuleListFilterInvalid,
			"invalid filter query: %s", strings.Join(errs, "; "))
	}
	return compiled, nil
}
