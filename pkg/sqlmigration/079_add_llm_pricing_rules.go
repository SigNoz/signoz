package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addLLMPricingRules struct {
	sqlschema sqlschema.SQLSchema
	sqlstore  sqlstore.SQLStore
}

func NewAddLLMPricingRulesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_llm_pricing_rule"), func(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
		return &addLLMPricingRules{
			sqlschema: sqlschema,
			sqlstore:  sqlstore,
		}, nil
	})
}

func (migration *addLLMPricingRules) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addLLMPricingRules) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "llm_pricing_rule",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "source_id", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "model", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "provider", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "model_pattern", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "unit", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "pricing", DataType: sqlschema.DataTypeText, Nullable: false, Default: "'{}'"},
			{Name: "is_override", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
			{Name: "synced_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
			{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, tableSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.PartialUniqueIndex{
			TableName:   "llm_pricing_rule",
			ColumnNames: []sqlschema.ColumnName{"org_id", "source_id"},
			Where:       "source_id IS NOT NULL",
		})

	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addLLMPricingRules) Down(context.Context, *bun.DB) error {
	return nil
}
