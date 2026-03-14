package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateCreatedByWithEmail struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateCreatedByWithEmailFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("update_created_by_with_email"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &updateCreatedByWithEmail{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *updateCreatedByWithEmail) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateCreatedByWithEmail) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	type userRow struct {
		ID    string `bun:"id"`
		Email string `bun:"email"`
	}

	var users []userRow
	err = tx.NewSelect().TableExpr("users").Column("id", "email").Scan(ctx, &users)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	userEmailMap := make(map[string]string, len(users))
	for _, u := range users {
		userEmailMap[u.ID] = u.Email
	}

	emails := make([]string, 0, len(userEmailMap))
	for _, email := range userEmailMap {
		emails = append(emails, email)
	}

	for id, email := range userEmailMap {
		_, err = tx.NewUpdate().
			TableExpr("agent_config_version").
			Set("created_by = ?", email).
			Where("created_by = ?", id).
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = tx.NewUpdate().
			TableExpr("agent_config_version").
			Set("updated_by = ?", email).
			Where("updated_by = ?", id).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	agentCreatedByQuery := tx.NewUpdate().
		TableExpr("agent_config_version").
		Set("created_by = ''").
		Where("created_by != ''")
	if len(emails) > 0 {
		agentCreatedByQuery = agentCreatedByQuery.Where("created_by NOT IN (?)", bun.In(emails))
	}
	if _, err = agentCreatedByQuery.Exec(ctx); err != nil {
		return err
	}

	agentUpdatedByQuery := tx.NewUpdate().
		TableExpr("agent_config_version").
		Set("updated_by = ''").
		Where("updated_by != ''")
	if len(emails) > 0 {
		agentUpdatedByQuery = agentUpdatedByQuery.Where("updated_by NOT IN (?)", bun.In(emails))
	}
	if _, err = agentUpdatedByQuery.Exec(ctx); err != nil {
		return err
	}

	for id, email := range userEmailMap {
		_, err = tx.NewUpdate().
			TableExpr("trace_funnel").
			Set("created_by = ?", email).
			Where("created_by = ?", id).
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = tx.NewUpdate().
			TableExpr("trace_funnel").
			Set("updated_by = ?", email).
			Where("updated_by = ?", id).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	funnelCreatedByQuery := tx.NewUpdate().
		TableExpr("trace_funnel").
		Set("created_by = ''").
		Where("created_by != ''")
	if len(emails) > 0 {
		funnelCreatedByQuery = funnelCreatedByQuery.Where("created_by NOT IN (?)", bun.In(emails))
	}
	if _, err = funnelCreatedByQuery.Exec(ctx); err != nil {
		return err
	}

	funnelUpdatedByQuery := tx.NewUpdate().
		TableExpr("trace_funnel").
		Set("updated_by = ''").
		Where("updated_by != ''")
	if len(emails) > 0 {
		funnelUpdatedByQuery = funnelUpdatedByQuery.Where("updated_by NOT IN (?)", bun.In(emails))
	}
	if _, err = funnelUpdatedByQuery.Exec(ctx); err != nil {
		return err
	}

	quickFilterTable, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("quick_filter"))
	if err != nil {
		return err
	}

	sqls := [][]byte{}

	createdByCol := &sqlschema.Column{Name: "created_by"}
	dropSQLS := migration.sqlschema.Operator().DropColumn(quickFilterTable, createdByCol)
	sqls = append(sqls, dropSQLS...)

	updatedByCol := &sqlschema.Column{Name: "updated_by"}
	dropSQLS = migration.sqlschema.Operator().DropColumn(quickFilterTable, updatedByCol)
	sqls = append(sqls, dropSQLS...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateCreatedByWithEmail) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
