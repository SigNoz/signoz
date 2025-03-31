package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateUserTables struct {
	store sqlstore.SQLStore
}

type existingResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request"`
	ID            int    `bun:"id,pk,autoincrement" json:"id"`
	Token         string `bun:"token,type:text,notnull" json:"token"`
	UserID        string `bun:"user_id,type:text,notnull" json:"userId"`
}

type newResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_request_new"`
	types.Identifiable
	Token  string `bun:"token,type:text,notnull" json:"token"`
	UserID string `bun:"user_id,type:text,notnull" json:"userId"`
}

func NewUpdateUserTablesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.
		NewProviderFactory(
			factory.MustNewName("update_user_tables"),
			func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
				return newUpdateUserTables(ctx, ps, c, sqlstore)
			})
}

func newUpdateUserTables(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateUserTables{store: store}, nil
}

func (migration *updateUserTables) Register(migrations *migrate.Migrations) error {
	if err := migrations.
		Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateUserTables) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.
		BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = migration.store.Dialect().UpdatePrimaryKey(ctx, tx, new(existingResetPasswordRequest), new(newResetPasswordRequest), UserReference, func(ctx context.Context) error {
		existingResetPasswordRequests := make([]*existingResetPasswordRequest, 0)
		err = tx.
			NewSelect().
			Model(&existingResetPasswordRequests).
			Scan(ctx)
		if err != nil {
			if err != sql.ErrNoRows {
				return err
			}
		}

		if err == nil && len(existingResetPasswordRequests) > 0 {
			newResetPasswordRequests := migration.
				CopyExistingResetPasswordRequestsToNewResetPasswordRequests(existingResetPasswordRequests)
			_, err = tx.
				NewInsert().
				Model(&newResetPasswordRequests).
				Exec(ctx)
			if err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateUserTables) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateUserTables) CopyExistingResetPasswordRequestsToNewResetPasswordRequests(existingPasswordRequests []*existingResetPasswordRequest) []*newResetPasswordRequest {
	newResetPasswordRequests := make([]*newResetPasswordRequest, 0)
	for _, request := range existingPasswordRequests {
		newResetPasswordRequests = append(newResetPasswordRequests, &newResetPasswordRequest{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Token:  request.Token,
			UserID: request.UserID,
		})
	}
	return newResetPasswordRequests
}
