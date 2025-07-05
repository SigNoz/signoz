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
	fmter    sqlschema.Formatter
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
	fmter := sqlschema.NewFormatter(sqlitedialect.New())

	return &provider{
		fmter:    fmter,
		settings: settings,
		sqlstore: sqlstore,
		operator: sqlschema.NewOperator(fmter, false, false),
	}, nil
}

func (provider *provider) Operator() sqlschema.SQLOperator {
	return provider.operator
}

func (provider *provider) GetTable(ctx context.Context, name sqlschema.TableName) (*sqlschema.Table, []*sqlschema.UniqueConstraint, error) {
	var sql string

	if err := provider.
		sqlstore.
		BunDB().
		NewRaw("SELECT sql FROM sqlite_master WHERE type IN (?) AND tbl_name = ? AND sql IS NOT NULL", bun.In([]string{"table"}), string(name)).
		Scan(ctx, &sql); err != nil {
		return nil, nil, err
	}

	table, uniqueConstraints, err := parseCreateTable(sql, provider.fmter)
	if err != nil {
		return nil, nil, err
	}

	return table, uniqueConstraints, nil
}

func (provider *provider) GetIndices(ctx context.Context, name sqlschema.TableName) ([]sqlschema.Index, error) {
	return []sqlschema.Index{}, nil
}
