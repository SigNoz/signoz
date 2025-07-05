package sqlitesqlschema

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type provider struct {
	settings factory.ScopedProviderSettings
	fmtter   sqlschema.Formatter
	sqlstore sqlstore.SQLStore
	tabled   sqlschema.TabledSQLSchema
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config, sqlstore sqlstore.SQLStore) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/sqlitesqlschema")
	fmtter := sqlschema.NewFormatter(sqlitedialect.New())

	return &provider{
		fmtter:   fmtter,
		settings: settings,
		sqlstore: sqlstore,
		tabled:   newTabled(fmtter),
	}, nil
}

func (provider *provider) Tabled() sqlschema.TabledSQLSchema {
	return provider.tabled
}

func (provider *provider) CreateIndex(ctx context.Context, index sqlschema.Index) ([][]byte, error) {
	return [][]byte{index.ToCreateSQL(provider.fmtter)}, nil
}

func (provider *provider) DropConstraint(ctx context.Context, tableName sqlschema.TableName, constraint sqlschema.Constraint) ([][]byte, error) {
	table, uniqueConstraints, _, err := provider.GetTable(ctx, tableName)
	if err != nil {
		return nil, err
	}

	return provider.tabled.DropConstraint(table, uniqueConstraints, constraint), nil
}

func (provider *provider) AddColumn(ctx context.Context, tableName sqlschema.TableName, column *sqlschema.Column, val any) ([][]byte, error) {
	table, _, _, err := provider.GetTable(ctx, tableName)
	if err != nil {
		return nil, err
	}

	return provider.tabled.AddColumn(table, column, val), nil
}

func (provider *provider) GetTable(ctx context.Context, name sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, []sqlschema.Index, error) {
	var sql string

	if err := provider.
		sqlstore.
		BunDB().
		NewRaw("SELECT sql FROM sqlite_master WHERE type IN (?) AND tbl_name = ? AND sql IS NOT NULL", bun.In([]string{"table"}), string(name)).
		Scan(ctx, &sql); err != nil {
		return nil, nil, nil, err
	}

	table, uniqueConstraints, err := parseCreateTable(sql, provider.fmtter)
	if err != nil {
		return nil, nil, nil, err
	}

	return table, uniqueConstraints, nil, nil
}
