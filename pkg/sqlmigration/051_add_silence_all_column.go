package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"log/slog"
)

type addSilenceAllColumn struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
	logger    *slog.Logger
}

type plannedMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance"`
	types.Identifiable
	SilenceAll bool `bun:"silence_all,type:boolean"`
}

type plannedMaintenanceRule struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`
	types.Identifiable
	PlannedMaintenanceID valuer.UUID `bun:"planned_maintenance_id,type:text"`
	RuleID               valuer.UUID `bun:"rule_id,type:text"`
}

func NewAddSilenceAllColumnFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_silence_all_column"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddSilenceAllColumn(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddSilenceAllColumn(_ context.Context, settings factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addSilenceAllColumn{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
		logger:    settings.Logger,
	}, nil
}

func (migration *addSilenceAllColumn) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addSilenceAllColumn) Up(ctx context.Context, db *bun.DB) error {
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("planned_maintenance"))
	if err != nil {
		return err
	}

	for _, column := range table.Columns {
		if column.Name == "silence_all" {
			return nil
		}
	}

	var joinTableBackup []plannedMaintenanceRule
	err = db.NewSelect().
		Model(&joinTableBackup).
		Scan(ctx)
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "failed to backup planned_maintenance_rule data: %v", err)
	}

	maintenanceIDsMap := make(map[string]bool)
	for _, record := range joinTableBackup {
		maintenanceIDsMap[record.PlannedMaintenanceID.StringValue()] = true
	}
	var maintenanceIDsWithRules []string
	for id := range maintenanceIDsMap {
		maintenanceIDsWithRules = append(maintenanceIDsWithRules, id)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	column := &sqlschema.Column{
		Name:     "silence_all",
		DataType: sqlschema.DataTypeBoolean,
		Nullable: false,
		Default:  "false",
	}

	columnSQLs := migration.sqlschema.Operator().AddColumn(table, nil, column, nil)
	sqls = append(sqls, columnSQLs...)

	for _, sqlStmt := range sqls {
		if _, err := tx.ExecContext(ctx, string(sqlStmt)); err != nil {
			return err
		}
	}

	if len(joinTableBackup) > 0 {
		_, err = tx.NewInsert().
			Model(&joinTableBackup).
			Exec(ctx)
		if err != nil {
			return errors.NewInternalf(errors.CodeInternal, "failed to restore planned_maintenance_rule data: %v", err)
		}
	}

	err = migration.backfillSilenceAll(ctx, tx, maintenanceIDsWithRules)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addSilenceAllColumn) backfillSilenceAll(ctx context.Context, tx bun.Tx, maintenanceIDsWithRules []string) error {
	if len(maintenanceIDsWithRules) == 0 {
		_, err := tx.NewUpdate().
			Model((*plannedMaintenance)(nil)).
			Set("silence_all = ?", true).
			Where("1 = 1").
			Exec(ctx)
		return err
	}

	_, err := tx.NewUpdate().
		Model((*plannedMaintenance)(nil)).
		Set("silence_all = ?", true).
		Where("id NOT IN (?)", bun.In(maintenanceIDsWithRules)).
		Exec(ctx)

	return err
}

func (migration *addSilenceAllColumn) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
