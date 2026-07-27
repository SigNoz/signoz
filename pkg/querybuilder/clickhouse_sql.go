package querybuilder

import (
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
)

// hasUnterminatedBlockComment reports whether the query ends inside a block comment.
// The parser loops forever on one, so it cannot be left to ParseStmts to reject.
func hasUnterminatedBlockComment(query string) bool {
	for i := 0; i < len(query); i++ {
		switch {
		case query[i] == '\'', query[i] == '"', query[i] == '`':
			quote := query[i]
			for i++; i < len(query); i++ {
				if query[i] == '\\' {
					i++
					continue
				}
				if query[i] == quote {
					break
				}
			}
		case strings.HasPrefix(query[i:], "--"):
			newline := strings.IndexByte(query[i:], '\n')
			if newline < 0 {
				return false
			}
			i += newline
		case strings.HasPrefix(query[i:], "/*"):
			// ClickHouse block comments do not nest, so the first */ closes it.
			end := strings.Index(query[i+2:], "*/")
			if end < 0 {
				return true
			}
			i += end + 3
		}
	}

	return false
}

// internalDatabases hold server metadata, credentials and grants rather than telemetry.
var internalDatabases = map[string]struct{}{
	"system":             {},
	"information_schema": {},
}

// ValidateReadOnlySelect rejects a user-authored ClickHouse statement unless it is a
// single SELECT that reads telemetry: no table function, no internal database and no
// lowering of the readonly setting. It must run on the rendered statement, since the
// substituted variable values are user input too.
func ValidateReadOnlySelect(query string) (err error) {
	// The parser panics on some malformed input rather than returning an error.
	defer func() {
		if recovered := recover(); recovered != nil {
			err = errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid ClickHouse SQL: %v", recovered)
		}
	}()

	if hasUnterminatedBlockComment(query) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid ClickHouse SQL: unterminated block comment")
	}

	stmts, parseErr := chparser.NewParser(query).ParseStmts()
	if parseErr != nil {
		// The cause is carried in the message because the renderers drop the wrapped error.
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid ClickHouse SQL: %s", parseErr.Error())
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
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "ClickHouse table functions are not allowed in SQL queries: %s", expr.Name.String())
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
