package querybuilder

import (
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
)

// ValidateReadOnlyClickHouseSQL rejects a user-authored statement unless it is a
// single SELECT that neither reads through a table function nor lowers the readonly
// setting. It must run on the rendered statement, since the substituted variable
// values are user input too.
func ValidateReadOnlyClickHouseSQL(query string) (err error) {
	// The parser panics on some malformed input rather than returning an error.
	defer func() {
		if recovered := recover(); recovered != nil {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid ClickHouse SQL: %v", recovered)
		}
	}()

	stmts, parseErr := chparser.NewParser(query).ParseStmts()
	if parseErr != nil {
		return errors.WrapInvalidInputf(parseErr, errors.CodeInvalidInput, "invalid ClickHouse SQL")
	}

	if len(stmts) != 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "ClickHouse SQL must contain exactly one statement")
	}

	selectQuery, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "only SELECT statements are allowed in ClickHouse SQL queries")
	}

	visitor := &chparser.DefaultASTVisitor{Visit: func(node chparser.Expr) error {
		switch expr := node.(type) {
		case *chparser.TableFunctionExpr:
			// Source table functions remain usable in ClickHouse read-only mode.
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"ClickHouse table functions are not allowed in SQL queries: %s",
				expr.Name.String(),
			)
		case *chparser.SettingExpr:
			// A query-level setting takes precedence over the context setting.
			if strings.EqualFold(expr.Name.Name, "readonly") {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"the ClickHouse readonly setting cannot be overridden",
				)
			}
		}
		return nil
	}}

	return selectQuery.Accept(visitor)
}
