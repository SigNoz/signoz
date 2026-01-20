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

type updateResetPassword struct {
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

type existingPersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_tokens"`
	types.TimeAuditable
	OrgID           string `json:"orgId" bun:"org_id,type:text,notnull"`
	ID              int    `json:"id" bun:"id,pk,autoincrement"`
	Role            string `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	UserID          string `json:"userId" bun:"user_id,type:text,notnull"`
	Token           string `json:"token" bun:"token,type:text,notnull,unique"`
	Name            string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt       int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed        int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked         bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UpdatedByUserID string `json:"updatedByUserId" bun:"updated_by_user_id,type:text,notnull,default:''"`
}

type newPersonalAccessToken struct {
	bun.BaseModel `bun:"table:personal_access_token"`
	types.Identifiable
	types.TimeAuditable
	OrgID           string `json:"orgId" bun:"org_id,type:text,notnull"`
	Role            string `json:"role" bun:"role,type:text,notnull,default:'ADMIN'"`
	UserID          string `json:"userId" bun:"user_id,type:text,notnull"`
	Token           string `json:"token" bun:"token,type:text,notnull,unique"`
	Name            string `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt       int64  `json:"expiresAt" bun:"expires_at,notnull,default:0"`
	LastUsed        int64  `json:"lastUsed" bun:"last_used,notnull,default:0"`
	Revoked         bool   `json:"revoked" bun:"revoked,notnull,default:false"`
	UpdatedByUserID string `json:"updatedByUserId" bun:"updated_by_user_id,type:text,notnull,default:''"`
}

func NewUpdateResetPasswordFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_reset_password"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateResetPassword(ctx, ps, c, sqlstore)
	})
}

func newUpdateResetPassword(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateResetPassword{store: store}, nil
}

func (migration *updateResetPassword) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateResetPassword) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

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
			newResetPasswordRequests := migration.CopyExistingResetPasswordRequestsToNewResetPasswordRequests(existingResetPasswordRequests)
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
		return err
	}

	err = migration.store.Dialect().RenameTableAndModifyModel(ctx, tx, new(existingPersonalAccessToken), new(newPersonalAccessToken), []string{OrgReference, UserReference}, func(ctx context.Context) error {
		existingPersonalAccessTokens := make([]*existingPersonalAccessToken, 0)
		err = tx.
			NewSelect().
			Model(&existingPersonalAccessTokens).
			Scan(ctx)
		if err != nil {
			if err != sql.ErrNoRows {
				return err
			}
		}

		if err == nil && len(existingPersonalAccessTokens) > 0 {
			newPersonalAccessTokens := migration.CopyExistingPATsToNewPATs(existingPersonalAccessTokens)
			_, err = tx.NewInsert().Model(&newPersonalAccessTokens).Exec(ctx)
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

func (migration *updateResetPassword) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateResetPassword) CopyExistingResetPasswordRequestsToNewResetPasswordRequests(existingPasswordRequests []*existingResetPasswordRequest) []*newResetPasswordRequest {
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

func (migration *updateResetPassword) CopyExistingPATsToNewPATs(existingPATs []*existingPersonalAccessToken) []*newPersonalAccessToken {
	newPATs := make([]*newPersonalAccessToken, 0)
	for _, pat := range existingPATs {
		newPATs = append(newPATs, &newPersonalAccessToken{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: pat.CreatedAt,
				UpdatedAt: pat.UpdatedAt,
			},
			Role:            pat.Role,
			Name:            pat.Name,
			ExpiresAt:       pat.ExpiresAt,
			LastUsed:        pat.LastUsed,
			UserID:          pat.UserID,
			Token:           pat.Token,
			Revoked:         pat.Revoked,
			UpdatedByUserID: pat.UpdatedByUserID,
			OrgID:           pat.OrgID,
		})
	}
	return newPATs
}
