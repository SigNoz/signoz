package querybuilder

import (
	"context"
	"log/slog"
	"maps"
	"slices"
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
	CodeClickHouseSQLReadingFunction    = errors.MustNewCode("clickhouse_sql_reading_function")
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
// Keyed by the lowercased name so that matching is case-insensitive, valued by the spelling to name it back to the caller.
//
// TODO(@therealpandey): take a deployment level allow list on top of this, so an operator can permit more without a release.
var generatorTableFunctions = map[string]string{
	"numbers":         "numbers",
	"numbers_mt":      "numbers_mt",
	"zeros":           "zeros",
	"zeros_mt":        "zeros_mt",
	"generateseries":  "generateSeries",
	"generate_series": "generate_series",
}

var generatorTableFunctionsMessage = "allowed table functions are " + strings.Join(slices.Sorted(maps.Values(generatorTableFunctions)), ", ")

// readingFunctions reach a file, a model or the server binary while looking like ordinary
// scalar functions. They name no table and no database, so neither of the rules above sees
// them, and a wrapper that returns a number leaks what they read through the row count alone:
// numbers(length(file(x))) yields one row per byte.
//
// Keyed by the lowercased name, since ClickHouse resolves function names case-insensitively.
var readingFunctions = map[string]struct{}{
	"file":                     {},
	"catboostevaluate":         {},
	"demangle":                 {},
	"addresstoline":            {},
	"addresstolinewithinlines": {},
	"addresstosymbol":          {},
}

// A dictionary can be backed by HTTP, ODBC or another database, and every one of the 42
// accessors carries this prefix.
const dictionaryFunctionPrefix = "dict"

func errIfFunctionReads(name string) error {
	lowered := strings.ToLower(name)
	if _, ok := readingFunctions[lowered]; !ok && !strings.HasPrefix(lowered, dictionaryFunctionPrefix) {
		return nil
	}

	return errors.NewInvalidInputf(CodeClickHouseSQLReadingFunction, "ClickHouse functions that read outside the telemetry tables are not allowed in SQL queries: %s", name)
}

// The parser spells a call's name as an Ident everywhere it can. Reading the field rather than
// formatting the node keeps the quoting out, so `numbers`(1) matches numbers.
func functionName(expr chparser.Expr) string {
	if ident, ok := expr.(*chparser.Ident); ok {
		return ident.Name
	}

	return chparser.Format(expr)
}

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
		case *chparser.TableExpr:
			// Source table functions remain usable in ClickHouse read-only mode, and only a
			// table position can be one. The parser also types a call inside a table function's
			// argument list as a TableFunctionExpr, so asking every one of those refuses the
			// numbers(intDiv(...)) that every dashboard writes. What can read from an argument
			// is caught by name below instead.
			source := expr.Expr
			if alias, ok := source.(*chparser.AliasExpr); ok {
				source = alias.Expr
			}

			tableFunction, ok := source.(*chparser.TableFunctionExpr)
			if !ok {
				return nil
			}

			name := functionName(tableFunction.Name)
			if _, ok := generatorTableFunctions[strings.ToLower(name)]; ok {
				return nil
			}

			return errors.
				NewInvalidInputf(CodeClickHouseSQLTableFunction, "ClickHouse table functions are not allowed in SQL queries: %s", name).
				WithAdditional(generatorTableFunctionsMessage)

		case *chparser.FunctionExpr:
			return errIfFunctionReads(expr.Name.Name)

		case *chparser.TableFunctionExpr:
			// Reached for a call in an argument list, and for a table position ahead of the
			// TableExpr above, since a node is visited after its children.
			return errIfFunctionReads(functionName(expr.Name))

		case *chparser.Path:
			// ClickHouse reads `x IN db.table` as a select from that table, and a qualified name
			// on the right of IN is a Path rather than a TableIdentifier.
			if len(expr.Fields) < 2 {
				return nil
			}

			if _, ok := internalDatabases[strings.ToLower(expr.Fields[0].Name)]; ok {
				return errors.NewInvalidInputf(CodeClickHouseSQLInternalDatabase, "the ClickHouse %s database is not allowed in SQL queries", expr.Fields[0].Name)
			}

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
