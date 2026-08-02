package querybuilder

import (
	"context"
	"log/slog"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	CodeClickHouseSQLParserPanic        = errors.MustNewCode("clickhouse_sql_parser_panic")
	CodeClickHouseSQLUnparseable        = errors.MustNewCode("clickhouse_sql_unparseable")
	CodeClickHouseSQLNotSingleStatement = errors.MustNewCode("clickhouse_sql_not_single_statement")
	CodeClickHouseSQLNotSelect          = errors.MustNewCode("clickhouse_sql_not_select")
	CodeClickHouseSQLTableFunction      = errors.MustNewCode("clickhouse_sql_table_function")
	CodeClickHouseSQLInternalDatabase   = errors.MustNewCode("clickhouse_sql_internal_database")
	CodeClickHouseSQLReadonlyOverride   = errors.MustNewCode("clickhouse_sql_readonly_override")
)

// internalDatabases hold server metadata, credentials and grants rather than telemetry.
var internalDatabases = map[string]struct{}{
	"system":             {},
	"information_schema": {},
}

// generatorTableFunctions compute their rows from their arguments alone. They open no file or socket, reach no other host, and name no table, database or dictionary, so none of them can read through anything the rules here exist to protect. Can be used to build a dense axis to join a sparse series against. Every other table function is refused.
//
// TODO(@therealpandey): take a deployment level allow list on top of this, so an operator can permit more without a release.
var generatorTableFunctions = map[string]struct{}{
	"numbers":         {},
	"numbers_mt":      {},
	"zeros":           {},
	"zeros_mt":        {},
	"generateseries":  {},
	"generate_series": {},
}

// The keys above lowercased for matching, spelled here as a caller would write them. Kept in step by TestGeneratorTableFunctionsMessageMatchesSet.
const generatorTableFunctionsMessage = "allowed table functions are numbers, numbers_mt, zeros, zeros_mt, generateSeries, generate_series"

// The parser's grammar has gaps against SQL that ClickHouse itself accepts.
func ErrIfStatementIsNotValid(query string) (err error) {
	defer func() {
		// The parser has a history of panicking on malformed input rather than returning an error.
		if recovered := recover(); recovered != nil {
			err = errors.NewInvalidInputf(CodeClickHouseSQLParserPanic, "invalid ClickHouse SQL (recovered): %v", recovered)
		}
	}()

	stmts, parseErr := chparser.NewParser(query).ParseStmts()
	if parseErr != nil {
		// Wrapped rather than formatted in, so that callers can recover the parser's *ParseError and read the position off it.
		return errors.WrapInvalidInputf(parseErr, CodeClickHouseSQLUnparseable, "invalid ClickHouse SQL: %s", parseErr.Error())
	}

	if len(stmts) != 1 {
		return errors.NewInvalidInputf(CodeClickHouseSQLNotSingleStatement, "ClickHouse SQL must contain exactly one statement, found %d statements", len(stmts))
	}

	selectQuery, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return errors.NewInvalidInputf(CodeClickHouseSQLNotSelect, "only SELECT statements are allowed in ClickHouse SQL queries")
	}

	visitor := &chparser.DefaultASTVisitor{Visit: func(node chparser.Expr) error {
		switch expr := node.(type) {
		case *chparser.TableFunctionExpr:
			// Source table functions remain usable in ClickHouse read-only mode. Arguments are
			// visited before this, so a read smuggled into one is already refused by the time
			// an allowed generator gets here.
			name := chparser.Format(expr.Name)
			if _, ok := generatorTableFunctions[strings.ToLower(name)]; ok {
				return nil
			}

			return errors.
				NewInvalidInputf(CodeClickHouseSQLTableFunction, "ClickHouse table functions are not allowed in SQL queries: %s", name).
				WithAdditional(generatorTableFunctionsMessage)

		case *chparser.TableIdentifier:
			// Reading these is unaffected by ClickHouse read-only mode.
			if expr.Database == nil {
				return nil
			}

			if _, ok := internalDatabases[strings.ToLower(expr.Database.Name)]; ok {
				return errors.NewInvalidInputf(CodeClickHouseSQLInternalDatabase, "the ClickHouse %s database is not allowed in SQL queries", expr.Database.Name)
			}

		case *chparser.SettingExpr:
			// A query-level setting takes precedence over the context setting.
			if strings.EqualFold(expr.Name.Name, "readonly") {
				return errors.NewInvalidInputf(CodeClickHouseSQLReadonlyOverride, "the ClickHouse readonly setting cannot be overridden")
			}
		}

		return nil
	}}

	return selectQuery.Accept(visitor)
}

// TODO(@therealpandey): remove this and move to ErrIfStatementIsNotValid.
func LogIfStatementIsNotValid(ctx context.Context, logger *slog.Logger, query string) {
	if err := ErrIfStatementIsNotValid(query); err != nil {
		logger.WarnContext(ctx, "clickhouse sql is not valid", errors.Attr(err), slog.String("query", query))
	}
}
