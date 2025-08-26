package sqlitesqlschema

import (
	"context"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
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
			DropConstraint:          false,
			ColumnIfNotExistsExists: false,
			AlterColumnSetNotNull:   false,
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
		return nil, nil, err
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
		return nil, err
	}

	defer func() {
		if err := rows.Close(); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "error closing rows", "error", err)
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
			columns []sqlschema.ColumnName
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

		if err := provider.
			sqlstore.
			BunDB().
			NewRaw("SELECT name FROM PRAGMA_index_info(?)", string(name)).
			Scan(ctx, &columns); err != nil {
			return nil, err
		}

		if unique {
			indices = append(indices, (&sqlschema.UniqueIndex{
				TableName:   tableName,
				ColumnNames: columns,
			}).Named(name).(*sqlschema.UniqueIndex))
		}
	}

	return indices, nil
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
