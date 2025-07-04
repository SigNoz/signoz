package postgressqlschema

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun/dialect/pgdialect"
)

type provider struct {
	fmtter   Formatter
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config] {
	return factory.NewProviderFactory(factory.MustNewName("postgres"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
		return New(ctx, providerSettings, config)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlschema.Config) (sqlschema.SQLSchema, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlschema/postgressqlschema")

	return &provider{
		fmtter:   Formatter{Formatter: sqlschema.NewFormatter(pgdialect.New())},
		settings: settings,
	}, nil
}

func (provider *provider) CreateIndex(ctx context.Context, index sqlschema.Index) [][]byte {
	return [][]byte{index.ToCreateSQL(provider.fmtter)}
}

func (provider *provider) DropConstraintUnsafe(ctx context.Context, table *sqlschema.Table, constraint sqlschema.Constraint) [][]byte {
	sql := [][]byte{}
	sql = append(sql, table.ToDropConstraintSQL(provider.fmtter, constraint))

	// Postgres typically creates indexes with the convention of `<table_name>_<column_name>_key` if no name is provided.
	sql = append(sql, table.ToDropConstraintSQL(provider.fmtter, &sqlschema.NamedConstraint{
		OverrideName: fmt.Sprintf("%s_%s_key", table.Name, strings.Join(constraint.Columns(), "_")),
		Constraint:   constraint,
	}))

	return sql
}

func (provider *provider) AddColumnUnsafe(ctx context.Context, table *sqlschema.Table, column *sqlschema.Column, val any) [][]byte {
	sqls := [][]byte{
		column.ToAddSQL(provider.fmtter, table.Name),
		column.ToUpdateSQL(provider.fmtter, table.Name, val),
	}

	if !column.Nullable {
		sqls = append(sqls, column.ToSetNotNullSQL(provider.fmtter, table.Name))
	}

	return sqls
}
