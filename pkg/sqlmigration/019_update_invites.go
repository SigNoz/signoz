package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateInvites struct {
	store sqlstore.SQLStore
}

type existingInvite struct {
	bun.BaseModel `bun:"table:invites"`

	OrgID     string    `bun:"org_id,type:text,notnull" json:"orgId"`
	ID        int       `bun:"id,pk,autoincrement" json:"id"`
	Name      string    `bun:"name,type:text,notnull" json:"name"`
	Email     string    `bun:"email,type:text,notnull,unique" json:"email"`
	Token     string    `bun:"token,type:text,notnull" json:"token"`
	CreatedAt time.Time `bun:"created_at,notnull" json:"createdAt"`
	Role      string    `bun:"role,type:text,notnull" json:"role"`
}

type newInvite struct {
	bun.BaseModel `bun:"table:user_invite"`

	types.Identifiable
	types.TimeAuditable
	Name  string `bun:"name,type:text,notnull" json:"name"`
	Email string `bun:"email,type:text,notnull,unique" json:"email"`
	Token string `bun:"token,type:text,notnull" json:"token"`
	Role  string `bun:"role,type:text,notnull" json:"role"`
	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
}

func NewUpdateInvitesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_invites"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateInvites(ctx, ps, c, sqlstore)
	})
}

func newUpdateInvites(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateInvites{store: store}, nil
}

func (migration *updateInvites) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateInvites) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingInvite), new(newInvite), []string{OrgReference}, func(ctx context.Context) error {
			existingInvites := make([]*existingInvite, 0)
			err = tx.
				NewSelect().
				Model(&existingInvites).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingInvites) > 0 {
				newInvites := migration.CopyOldInvitesToNewInvites(existingInvites)
				_, err = tx.
					NewInsert().
					Model(&newInvites).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateInvites) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateInvites) CopyOldInvitesToNewInvites(existingInvites []*existingInvite) []*newInvite {
	newInvites := make([]*newInvite, 0)
	for _, invite := range existingInvites {
		newInvites = append(newInvites, &newInvite{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: invite.CreatedAt,
				UpdatedAt: time.Now(),
			},
			Name:  invite.Name,
			Email: invite.Email,
			Token: invite.Token,
			Role:  invite.Role,
			OrgID: invite.OrgID,
		})
	}

	return newInvites
}
