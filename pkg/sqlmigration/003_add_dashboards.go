package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addDashboards struct{}

func NewAddDashboardsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_dashboards"), newAddDashboards)
}

func newAddDashboards(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDashboards{}, nil
}

func (migration *addDashboards) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addDashboards) Up(ctx context.Context, db *bun.DB) error {
	// table:dashboards
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:dashboards"`
			ID            int       `bun:"id,pk,autoincrement"`
			UUID          string    `bun:"uuid,type:text,notnull,unique"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			CreatedBy     string    `bun:"created_by,type:text,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			UpdatedBy     string    `bun:"updated_by,type:text,notnull"`
			Data          string    `bun:"data,type:text,notnull"`
			Locked        int       `bun:"locked,notnull,default:0"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:rules
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:rules"`
			ID            int       `bun:"id,pk,autoincrement"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			CreatedBy     string    `bun:"created_by,type:text,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			UpdatedBy     string    `bun:"updated_by,type:text,notnull"`
			Deleted       int       `bun:"deleted,notnull,default:0"`
			Data          string    `bun:"data,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:notification_channels
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:notification_channels"`
			ID            int       `bun:"id,pk,autoincrement"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			Name          string    `bun:"name,type:text,notnull,unique"`
			Type          string    `bun:"type,type:text,notnull"`
			Deleted       int       `bun:"deleted,notnull,default:0"`
			Data          string    `bun:"data,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:planned_maintenance
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:planned_maintenance"`
			ID            int       `bun:"id,pk,autoincrement"`
			Name          string    `bun:"name,type:text,notnull"`
			Description   string    `bun:"description,type:text"`
			AlertIDs      string    `bun:"alert_ids,type:text"`
			Schedule      string    `bun:"schedule,type:text,notnull"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			CreatedBy     string    `bun:"created_by,type:text,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			UpdatedBy     string    `bun:"updated_by,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:ttl_status
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel  `bun:"table:ttl_status"`
			ID             int       `bun:"id,pk,autoincrement"`
			TransactionID  string    `bun:"transaction_id,type:text,notnull"`
			CreatedAt      time.Time `bun:"created_at,notnull"`
			UpdatedAt      time.Time `bun:"updated_at,notnull"`
			TableName      string    `bun:"table_name,type:text,notnull"`
			TTL            int       `bun:"ttl,notnull,default:0"`
			ColdStorageTTL int       `bun:"cold_storage_ttl,notnull,default:0"`
			Status         string    `bun:"status,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addDashboards) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
