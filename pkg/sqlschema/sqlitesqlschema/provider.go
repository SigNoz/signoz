package sqlitesqlschema

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type provider struct {
	fmtter   sqlschema.Formatter
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/sqlitesqlschema")

	return &provider{
		fmtter:   sqlschema.NewFormatter(sqlitedialect.New()),
		settings: settings,
	}, nil
}

func (provider *provider) CreateIndex(ctx context.Context, index sqlschema.Index) [][]byte {
	return [][]byte{index.ToCreateSQL(provider.fmtter)}
}

func (provider *provider) DropConstraintUnsafe(ctx context.Context, table *sqlschema.Table, _ sqlschema.Constraint) [][]byte {
	return table.ToCreateTempInsertDropAlterSQL(provider.fmtter)
}

func (provider *provider) AddColumnUnsafe(ctx context.Context, table *sqlschema.Table, column *sqlschema.Column, val any) [][]byte {
	sqls := [][]byte{
		column.ToAddSQL(provider.fmtter, table.Name),
		column.ToUpdateSQL(provider.fmtter, table.Name, val),
	}

	if !column.Nullable {
		sqls = append(sqls, table.ToCreateTempInsertDropAlterSQL(provider.fmtter)...)
	}

	return sqls
}
