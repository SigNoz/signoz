package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addSpanMapperOrigin struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddSpanMapperOriginFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_span_mapper_origin"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addSpanMapperOrigin{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addSpanMapperOrigin) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up adds the ownership columns that let SigNoz ship default mapping groups
// alongside user ones.
func (migration *addSpanMapperOrigin) Up(ctx context.Context, db *bun.DB) error {
	// span_mapper references span_mapper_group and both have foreign keys, so
	// enforcement must be off for the SQLite recreate-table fallback.
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	groupTable, groupUniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("span_mapper_group"))
	if err != nil {
		return err
	}

	sqls := migration.sqlschema.Operator().AddColumn(groupTable, groupUniqueConstraints, &sqlschema.Column{
		Name:     sqlschema.ColumnName("origin"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
		Default:  "'user'",
	}, "user")
	sqls = append(sqls, migration.sqlschema.Operator().AddColumn(groupTable, groupUniqueConstraints, &sqlschema.Column{
		Name:     sqlschema.ColumnName("version"),
		DataType: sqlschema.DataTypeBigInt,
		Nullable: false,
		Default:  "0",
	}, 0)...)

	mapperTable, mapperUniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("span_mapper"))
	if err != nil {
		return err
	}

	sqls = append(sqls, migration.sqlschema.Operator().AddColumn(mapperTable, mapperUniqueConstraints, &sqlschema.Column{
		Name:     sqlschema.ColumnName("origin"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
		Default:  "'user'",
	}, "user")...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *addSpanMapperOrigin) Down(context.Context, *bun.DB) error {
	return nil
}
