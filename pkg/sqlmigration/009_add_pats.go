package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types"
)

type addPats struct{}

func NewAddPatsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_pats"), newAddPats)
}

func newAddPats(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPats{}, nil
}

func (migration *addPats) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPats) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:org_domains"`
			ID            string              `bun:"id,pk,type:text"`
			OrgID         string              `bun:"org_id,type:text,notnull"`
			Name          string              `bun:"name,type:varchar(50),notnull,unique"`
			CreatedAt     time.Time           `bun:"created_at,notnull"`
			UpdatedAt     *time.Time          `bun:"updated_at,type:timestamp"`
			Data          string              `bun:"data,type:text,notnull"`
			Org           *types.Organization `bun:"rel:belongs-to,join:org_id=id"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:personal_access_tokens"`

			ID              int         `bun:"id,pk,autoincrement"`
			Role            string      `bun:"role,type:text,notnull,default:'ADMIN'"`
			UserID          string      `bun:"user_id,type:text,notnull"`
			User            *types.User `bun:"rel:belongs-to,join:user_id=id"`
			Token           string      `bun:"token,type:text,notnull,unique"`
			Name            string      `bun:"name,type:text,notnull"`
			CreatedAt       int         `bun:"created_at,notnull,default:0"`
			ExpiresAt       int         `bun:"expires_at,notnull,default:0"`
			UpdatedAt       int         `bun:"updated_at,notnull,default:0"`
			LastUsed        int         `bun:"last_used,notnull,default:0"`
			Revoked         bool        `bun:"revoked,notnull,default:false"`
			UpdatedByUserID string      `bun:"updated_by_user_id,type:text,notnull,default:''"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPats) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
