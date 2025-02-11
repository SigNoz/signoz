package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addOrganization struct{}

func NewAddOrganizationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_organization"), newAddOrganization)
}

func newAddOrganization(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addOrganization{}, nil
}

func (migration *addOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Up(ctx context.Context, db *bun.DB) error {

	// table:organizations
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel   `bun:"table:organizations"`
			ID              string `bun:"id,pk,type:text"`
			Name            string `bun:"name,type:text,notnull"`
			CreatedAt       int    `bun:"created_at,notnull"`
			IsAnonymous     int    `bun:"is_anonymous,notnull,default:0,CHECK(is_anonymous IN (0,1))"`
			HasOptedUpdates int    `bun:"has_opted_updates,notnull,default:1,CHECK(has_opted_updates IN (0,1))"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:groups
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:groups"`
			ID            string `bun:"id,pk,type:text"`
			Name          string `bun:"name,type:text,notnull,unique"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:users
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel     `bun:"table:users"`
			ID                string `bun:"id,pk,type:text"`
			Name              string `bun:"name,type:text,notnull"`
			Email             string `bun:"email,type:text,notnull,unique"`
			Password          string `bun:"password,type:text,notnull"`
			CreatedAt         int    `bun:"created_at,notnull"`
			ProfilePictureURL string `bun:"profile_picture_url,type:text"`
			GroupID           string `bun:"group_id,type:text,notnull"`
			OrgID             string `bun:"org_id,type:text,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		ForeignKey(`("group_id") REFERENCES "groups" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:invites
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:invites"`
			ID            int    `bun:"id,pk,autoincrement"`
			Name          string `bun:"name,type:text,notnull"`
			Email         string `bun:"email,type:text,notnull,unique"`
			Token         string `bun:"token,type:text,notnull"`
			CreatedAt     int    `bun:"created_at,notnull"`
			Role          string `bun:"role,type:text,notnull"`
			OrgID         string `bun:"org_id,type:text,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:reset_password_request
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:reset_password_request"`
			ID            int    `bun:"id,pk,autoincrement"`
			Token         string `bun:"token,type:text,notnull"`
			UserID        string `bun:"user_id,type:text,notnull"`
		}{}).
		ForeignKey(`("user_id") REFERENCES "users" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:user_flags
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:user_flags"`
			UserID        string `bun:"user_id,pk,type:text,notnull"`
			Flags         string `bun:"flags,type:text"`
		}{}).
		ForeignKey(`("user_id") REFERENCES "users" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:apdex_settings
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel      `bun:"table:apdex_settings"`
			ServiceName        string  `bun:"service_name,pk,type:text"`
			Threshold          float64 `bun:"threshold,type:float,notnull"`
			ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:ingestion_keys
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:ingestion_keys"`
			KeyId         string    `bun:"key_id,pk,type:text"`
			Name          string    `bun:"name,type:text"`
			CreatedAt     time.Time `bun:"created_at,default:current_timestamp"`
			IngestionKey  string    `bun:"ingestion_key,type:text,notnull"`
			IngestionURL  string    `bun:"ingestion_url,type:text,notnull"`
			DataRegion    string    `bun:"data_region,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
