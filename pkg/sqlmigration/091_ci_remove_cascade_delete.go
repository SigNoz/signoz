package sqlmigration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type cloudIntegrationRemoveCascadeDelete struct {
	sqlschema sqlschema.SQLSchema
}

type ciServiceRow struct {
	bun.BaseModel `bun:"table:cloud_integration_service"`

	ID                 string    `bun:"id"`
	CreatedAt          time.Time `bun:"created_at"`
	UpdatedAt          time.Time `bun:"updated_at"`
	Type               string    `bun:"type"`
	Config             string    `bun:"config"`
	CloudIntegrationID string    `bun:"cloud_integration_id"`
}

func NewCloudIntegrationRemoveCascadeDeleteFactory(sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("ci_remove_cascade_delete"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &cloudIntegrationRemoveCascadeDelete{sqlschema: sqlschema}, nil
		},
	)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Up(ctx context.Context, db *bun.DB) error {
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

	// get all existing rows
	var rows []*ciServiceRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	// get existing table
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("cloud_integration_service"))
	if err != nil {
		return err
	}

	// drop the existing table
	for _, sql := range migration.sqlschema.Operator().DropTable(table) {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// create new table without cascade delete FK
	newTable := &sqlschema.Table{
		Name: sqlschema.TableName("cloud_integration_service"),
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "config", DataType: sqlschema.DataTypeText, Nullable: true},
			{Name: "cloud_integration_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("cloud_integration_id"),
				ReferencedTableName:   sqlschema.TableName("cloud_integration"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	}

	// create table
	for _, sql := range migration.sqlschema.Operator().CreateTable(newTable) {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// add back existing rows
	if len(rows) > 0 {
		if _, err := tx.NewInsert().Model(&rows).Exec(ctx); err != nil {
			return err
		}
	}

	// create existing unique index on (cloud_integration_id, type)
	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "cloud_integration_service",
		ColumnNames: []sqlschema.ColumnName{"cloud_integration_id", "type"},
	})
	for _, sql := range indexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Down(context.Context, *bun.DB) error {
	return nil
}
