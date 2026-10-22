package sqlitesqlschema

import (
	"context"
	"log/slog"
	"strconv"
	"strings"

	"github.com/uptrace/bun"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type provider struct {
	settings factory.ScopedProviderSettings
	fmter    sqlschema.SQLFormatter
	sqlstore sqlstore.SQLStore
	operator sqlschema.SQLOperator
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config, sqlstore sqlstore.SQLStore) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/sqlitesqlschema")
	fmter := Formatter{sqlschema.NewFormatter(sqlstore.BunDB().Dialect())}

	return &provider{
		fmter:    fmter,
		settings: settings,
		sqlstore: sqlstore,
		operator: sqlschema.NewOperator(fmter, sqlschema.OperatorSupport{
			SCreateAndDropConstraint:                        false,
			SAlterTableAddAndDropColumnIfNotExistsAndExists: false,
			SAlterTableAlterColumnSetAndDrop:                false,
		}),
	}, nil
}

func (provider *provider) Formatter() sqlschema.SQLFormatter {
	return provider.fmter
}

func (provider *provider) Operator() sqlschema.SQLOperator {
	return provider.operator
}

func (provider *provider) GetTable(ctx context.Context, tableName sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, error) {
	var sql string

	if err := provider.
		sqlstore.
		BunDB().
		NewRaw("SELECT sql FROM sqlite_master WHERE type IN (?) AND tbl_name = ? AND sql IS NOT NULL", bun.In([]string{"table"}), string(tableName)).
		Scan(ctx, &sql); err != nil {
		return nil, nil, provider.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "table (%s) not found", tableName)
	}

	table, uniqueConstraints, err := parseCreateTable(sql, provider.fmter)
	if err != nil {
		return nil, nil, err
	}

	return table, uniqueConstraints, nil
}

func (provider *provider) GetIndices(ctx context.Context, tableName sqlschema.TableName) ([]sqlschema.Index, error) {
	rows, err := provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, "SELECT * FROM PRAGMA_index_list(?)", string(tableName))
	if err != nil {
		return nil, provider.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "no indices for table (%s) found", tableName)
	}

	defer func() {
		if err := rows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", errors.Attr(err))
		}
	}()

	indices := []sqlschema.Index{}
	for rows.Next() {
		var (
			seq     int
			name    string
			unique  bool
			origin  string
			partial bool
		)
		if err := rows.Scan(&seq, &name, &unique, &origin, &partial); err != nil {
			return nil, err
		}

		// skip the index that was created by a UNIQUE constraint
		if origin == "u" {
			continue
		}

		// skip the index that was created by primary key constraint
		if origin == "pk" {
			continue
		}

		if !unique {
			continue
		}

		columns, hasExpression, err := provider.indexKeys(ctx, name)
		if err != nil {
			return nil, err
		}

		// SQLite exposes expression keys and the predicate only in the DDL.
		var ddl string
		if hasExpression || partial {
			if err := provider.
				sqlstore.
				BunDB().
				NewRaw("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?", name).
				Scan(ctx, &ddl); err != nil {
				return nil, err
			}
		}

		// functional partial indexes aren't representable (PartialUniqueIndex has no
		// expressions); skip rather than misrepresent.
		if hasExpression && partial {
			provider.settings.Logger().WarnContext(ctx, "skipping functional partial unique index; not representable by sqlschema", slog.String("index", name), slog.String("table", string(tableName)))
			continue
		}

		var index sqlschema.Index
		if partial {
			index = &sqlschema.PartialUniqueIndex{
				TableName:   tableName,
				ColumnNames: columns,
				Where:       extractWhereClause(ddl),
			}
		} else if hasExpression {
			index = &sqlschema.UniqueIndexWithExpressions{
				TableName:   tableName,
				Expressions: extractIndexColumns(ddl),
			}
		} else {
			index = &sqlschema.UniqueIndex{
				TableName:   tableName,
				ColumnNames: columns,
			}
		}

		if index.Name() != name {
			index = index.Named(name)
		}
		indices = append(indices, index)
	}

	return indices, nil
}

// indexKeys returns an index's plain key columns and whether any key is an
// expression (SQLite marks expression keys with cid = -2 and a NULL name).
func (provider *provider) indexKeys(ctx context.Context, name string) ([]sqlschema.ColumnName, bool, error) {
	rows, err := provider.
		sqlstore.
		BunDB().
		QueryContext(ctx, "SELECT cid, name FROM PRAGMA_index_info(?)", name)
	if err != nil {
		return nil, false, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", errors.Attr(err))
		}
	}()

	var (
		columns       []sqlschema.ColumnName
		hasExpression bool
	)
	for rows.Next() {
		var (
			cid        int
			columnName *string
		)
		if err := rows.Scan(&cid, &columnName); err != nil {
			return nil, false, err
		}

		if cid == -2 {
			hasExpression = true
			continue
		}
		if columnName != nil {
			columns = append(columns, sqlschema.ColumnName(*columnName))
		}
	}

	return columns, hasExpression, nil
}

func (provider *provider) ToggleFKEnforcement(ctx context.Context, db bun.IDB, on bool) error {
	_, err := db.ExecContext(ctx, "PRAGMA foreign_keys = ?", on)
	if err != nil {
		return err
	}

	var val bool
	if err := db.NewRaw("PRAGMA foreign_keys").Scan(ctx, &val); err != nil {
		return err
	}

	if on == val {
		return nil
	}

	return errors.NewInternalf(errors.CodeInternal, "foreign_keys(actual: %s, expected: %s), maybe a transaction is in progress?", strconv.FormatBool(val), strconv.FormatBool(on))
}

// extractIndexColumns returns an index's key entries: the comma-separated items
// in the first top-level parenthesised list after ON, each verbatim (trimmed).
// Quotes and nested parens are respected so their commas don't split keys.
// SQLite reports expression keys with a NULL name in PRAGMA_index_info, so their
// text is only recoverable from the DDL.
func extractIndexColumns(sql string) []string {
	var (
		inSingleQuotedLiteral      bool
		inDoubleQuotedIdentifier   bool
		inBacktickQuotedIdentifier bool
		inBracketQuotedIdentifier  bool
		depth                      int
		started                    bool
		keyStart                   int
		columns                    []string
	)

	for i := 0; i < len(sql); i++ {
		switch sql[i] {
		case '\'':
			if inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				break
			}
			if inSingleQuotedLiteral && i+1 < len(sql) && sql[i+1] == '\'' {
				i++
				continue
			}
			inSingleQuotedLiteral = !inSingleQuotedLiteral
			continue
		case '"':
			if inSingleQuotedLiteral || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				break
			}
			if inDoubleQuotedIdentifier && i+1 < len(sql) && sql[i+1] == '"' {
				i++
				continue
			}
			inDoubleQuotedIdentifier = !inDoubleQuotedIdentifier
			continue
		case '`':
			if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBracketQuotedIdentifier {
				break
			}
			inBacktickQuotedIdentifier = !inBacktickQuotedIdentifier
			continue
		case '[':
			if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				break
			}
			inBracketQuotedIdentifier = true
			continue
		case ']':
			if inBracketQuotedIdentifier {
				inBracketQuotedIdentifier = false
			}
			continue
		}

		if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
			continue
		}

		switch sql[i] {
		case '(':
			depth++
			if depth == 1 && !started {
				started = true
				keyStart = i + 1
			}
		case ')':
			depth--
			if depth == 0 && started {
				columns = append(columns, strings.TrimSpace(sql[keyStart:i]))
				return columns
			}
		case ',':
			if depth == 1 {
				columns = append(columns, strings.TrimSpace(sql[keyStart:i]))
				keyStart = i + 1
			}
		}
	}

	return columns
}

func extractWhereClause(sql string) string {
	lastWhere := -1
	inSingleQuotedLiteral := false
	inDoubleQuotedIdentifier := false
	inBacktickQuotedIdentifier := false
	inBracketQuotedIdentifier := false

	for i := 0; i < len(sql); i++ {
		switch sql[i] {
		case '\'':
			if inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				continue
			}
			if inSingleQuotedLiteral && i+1 < len(sql) && sql[i+1] == '\'' {
				i++
				continue
			}
			inSingleQuotedLiteral = !inSingleQuotedLiteral
		case '"':
			if inSingleQuotedLiteral || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				continue
			}
			if inDoubleQuotedIdentifier && i+1 < len(sql) && sql[i+1] == '"' {
				i++
				continue
			}
			inDoubleQuotedIdentifier = !inDoubleQuotedIdentifier
		case '`':
			if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBracketQuotedIdentifier {
				continue
			}
			inBacktickQuotedIdentifier = !inBacktickQuotedIdentifier
		case '[':
			if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
				continue
			}
			inBracketQuotedIdentifier = true
		case ']':
			if inBracketQuotedIdentifier {
				inBracketQuotedIdentifier = false
			}
		}

		if inSingleQuotedLiteral || inDoubleQuotedIdentifier || inBacktickQuotedIdentifier || inBracketQuotedIdentifier {
			continue
		}

		if strings.EqualFold(sql[i:min(i+5, len(sql))], "WHERE") &&
			(i == 0 || !isSQLiteIdentifierChar(sql[i-1])) &&
			(i+5 == len(sql) || !isSQLiteIdentifierChar(sql[i+5])) {
			lastWhere = i
			i += 4
		}
	}

	if lastWhere == -1 {
		return ""
	}

	return strings.TrimSpace(sql[lastWhere+len("WHERE"):])
}

func isSQLiteIdentifierChar(ch byte) bool {
	return (ch >= 'a' && ch <= 'z') ||
		(ch >= 'A' && ch <= 'Z') ||
		(ch >= '0' && ch <= '9') ||
		ch == '_'
}
