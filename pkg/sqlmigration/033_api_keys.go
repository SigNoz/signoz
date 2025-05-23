package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migratePATToFactorAPIKey struct {
	store sqlstore.SQLStore
}

func NewMigratePATToFactorAPIKey(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("migrate_pat_to_factor_api_key"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newMigratePATToFactorAPIKey(ctx, ps, c, sqlstore)
	})
}

func newMigratePATToFactorAPIKey(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &migratePATToFactorAPIKey{store: store}, nil
}

func (migration *migratePATToFactorAPIKey) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

type existingPersonalAccessToken33 struct {
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

// we are removing the connection with org,
// the reason we are doing this is the api keys should just have
// one foreign key, we don't want a dangling state where, an API key
// belongs to one org and some user which doesn't belong to that org.
// so going ahead with directly attaching it to user will help dangling states.
type newFactorAPIKey33 struct {
	bun.BaseModel `bun:"table:factor_api_key"`

	types.Identifiable
	CreatedAt time.Time `bun:"created_at,notnull,nullzero,type:timestamptz" json:"createdAt"`
	UpdatedAt time.Time `bun:"updated_at,notnull,nullzero,type:timestamptz" json:"updatedAt"`
	CreatedBy string    `bun:"created_by,notnull" json:"createdBy"`
	UpdatedBy string    `bun:"updated_by,notnull" json:"updatedBy"`
	Token     string    `json:"token" bun:"token,type:text,notnull,unique"`
	Role      string    `json:"role" bun:"role,type:text,notnull"`
	Name      string    `json:"name" bun:"name,type:text,notnull"`
	ExpiresAt time.Time `json:"expiresAt" bun:"expires_at,notnull,nullzero,type:timestamptz"`
	LastUsed  time.Time `json:"lastUsed" bun:"last_used,notnull,nullzero,type:timestamptz"`
	Revoked   bool      `json:"revoked" bun:"revoked,notnull,default:false"`
	UserID    string    `json:"userId" bun:"user_id,type:text,notnull"`
}

func (migration *migratePATToFactorAPIKey) Up(ctx context.Context, db *bun.DB) error {
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
		RenameTableAndModifyModel(ctx, tx, new(existingPersonalAccessToken33), new(newFactorAPIKey33), []string{UserReferenceNoCascade}, func(ctx context.Context) error {
			existingAPIKeys := make([]*existingPersonalAccessToken33, 0)
			err = tx.
				NewSelect().
				Model(&existingAPIKeys).
				Scan(ctx)
			if err != nil && err != sql.ErrNoRows {
				return err
			}

			if err == nil && len(existingAPIKeys) > 0 {
				newAPIKeys, err := migration.
					CopyOldPatToFactorAPIKey(ctx, tx, existingAPIKeys)
				if err != nil {
					return err
				}
				_, err = tx.
					NewInsert().
					Model(&newAPIKeys).
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

func (migration *migratePATToFactorAPIKey) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *migratePATToFactorAPIKey) CopyOldPatToFactorAPIKey(ctx context.Context, tx bun.IDB, existingAPIKeys []*existingPersonalAccessToken33) ([]*newFactorAPIKey33, error) {
	newAPIKeys := make([]*newFactorAPIKey33, 0)
	for _, apiKey := range existingAPIKeys {

		if apiKey.CreatedAt.IsZero() {
			apiKey.CreatedAt = time.Now()
		}
		if apiKey.UpdatedAt.IsZero() {
			apiKey.UpdatedAt = time.Now()
		}

		// convert expiresAt and lastUsed to time.Time
		expiresAt := time.Unix(apiKey.ExpiresAt, 0)
		lastUsed := time.Unix(apiKey.LastUsed, 0)
		if apiKey.LastUsed == 0 {
			lastUsed = apiKey.CreatedAt
		}

		newAPIKeys = append(newAPIKeys, &newFactorAPIKey33{
			Identifiable: apiKey.Identifiable,
			CreatedAt:    apiKey.CreatedAt,
			UpdatedAt:    apiKey.UpdatedAt,
			CreatedBy:    apiKey.UserID,
			UpdatedBy:    apiKey.UpdatedByUserID,
			Token:        apiKey.Token,
			Role:         apiKey.Role,
			Name:         apiKey.Name,
			ExpiresAt:    expiresAt,
			LastUsed:     lastUsed,
			Revoked:      apiKey.Revoked,
			UserID:       apiKey.UserID,
		})
	}
	return newAPIKeys, nil
}
