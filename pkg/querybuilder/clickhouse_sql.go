package querybuilder

import (
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
)

// internalDatabases hold server metadata, credentials and grants rather than telemetry.
var internalDatabases = map[string]struct{}{
	"system":             {},
	"information_schema": {},
}

// The parser's grammar has gaps against SQL that ClickHouse itself accepts. See TestValidateReadOnlySelect_ShouldPassButFails.
func ValidateReadOnlySelect(query string) (err error) {
	defer func() {
		// The parser has a history of panicking on malformed input rather than returning an error.
		if recovered := recover(); recovered != nil {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid ClickHouse SQL (recovered): %v", recovered)
		}
	}()

	stmts, parseErr := chparser.NewParser(query).ParseStmts()
	if parseErr != nil {
		// Wrapped rather than formatted in, so that callers can recover the parser's *ParseError and read the position off it.
		return errors.WrapInvalidInputf(parseErr, errors.CodeInvalidInput, "invalid ClickHouse SQL: %s", parseErr.Error())
	}

	if len(stmts) != 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "ClickHouse SQL must contain exactly one statement, found %d statements", len(stmts))
	}

	selectQuery, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "only SELECT statements are allowed in ClickHouse SQL queries")
	}

	visitor := &chparser.DefaultASTVisitor{Visit: func(node chparser.Expr) error {
		switch expr := node.(type) {
		case *chparser.TableFunctionExpr:
			// Source table functions remain usable in ClickHouse read-only mode.
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "ClickHouse table functions are not allowed in SQL queries: %s", chparser.Format(expr.Name))

		case *chparser.TableIdentifier:
			// Reading these is unaffected by ClickHouse read-only mode.
			if expr.Database == nil {
				return nil
			}

			if _, ok := internalDatabases[strings.ToLower(expr.Database.Name)]; ok {
				return errors.NewInvalidInputf(errors.CodeInvalidInput, "the ClickHouse %s database is not allowed in SQL queries", expr.Database.Name)
			}

		case *chparser.SettingExpr:
			// A query-level setting takes precedence over the context setting.
			if strings.EqualFold(expr.Name.Name, "readonly") {
				return errors.NewInvalidInputf(errors.CodeInvalidInput, "the ClickHouse readonly setting cannot be overridden")
			}
		}

		return nil
	}}

	return selectQuery.Accept(visitor)
}
