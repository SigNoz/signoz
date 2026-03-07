package sqlmigration

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updatePreferences struct {
	store sqlstore.SQLStore
}

type existingOrgPreference struct {
	bun.BaseModel   `bun:"table:org_preference"`
	PreferenceID    string `bun:"preference_id,pk,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,pk,type:text,notnull"`
}

type newOrgPreference struct {
	bun.BaseModel `bun:"table:org_preference_new"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	OrgID           string `bun:"org_id,type:text,notnull"`
}

type existingUserPreference struct {
	bun.BaseModel   `bun:"table:user_preference"`
	PreferenceID    string `bun:"preference_id,type:text,pk"`
	PreferenceValue string `bun:"preference_value,type:text"`
	UserID          string `bun:"user_id,type:text,pk"`
}

type newUserPreference struct {
	bun.BaseModel `bun:"table:user_preference_new"`
	types.Identifiable
	PreferenceID    string `bun:"preference_id,type:text,notnull"`
	PreferenceValue string `bun:"preference_value,type:text,notnull"`
	UserID          string `bun:"user_id,type:text,notnull"`
}

func NewUpdatePreferencesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_preferences"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdatePreferences(ctx, ps, c, sqlstore)
	})
}

func newUpdatePreferences(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updatePreferences{store: store}, nil
}

func (migration *updatePreferences) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePreferences) Up(ctx context.Context, db *bun.DB) error {
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
		AddPrimaryKey(ctx, tx, new(existingOrgPreference), new(newOrgPreference), OrgReference, func(ctx context.Context) error {
			existingOrgPreferences := make([]*existingOrgPreference, 0)
			err = tx.
				NewSelect().
				Model(&existingOrgPreferences).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingOrgPreferences) > 0 {
				newOrgPreferences := migration.
					CopyOldOrgPreferencesToNewOrgPreferences(existingOrgPreferences)
				_, err = tx.
					NewInsert().
					Model(&newOrgPreferences).
					Exec(ctx)
				if err != nil {
					return err
				}
			}

			tableName := tx.Dialect().Tables().Get(reflect.TypeOf(new(existingOrgPreference))).Name
			_, err = tx.
				ExecContext(ctx, fmt.Sprintf("CREATE UNIQUE INDEX IF NOT EXISTS %s_unique_idx ON %s (preference_id, org_id)", tableName, fmt.Sprintf("%s_new", tableName)))
			if err != nil {
				return err
			}

			return nil
		})
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		AddPrimaryKey(ctx, tx, new(existingUserPreference), new(newUserPreference), UserReference, func(ctx context.Context) error {
			existingUserPreferences := make([]*existingUserPreference, 0)
			err = tx.
				NewSelect().
				Model(&existingUserPreferences).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingUserPreferences) > 0 {
				newUserPreferences := migration.CopyOldUserPreferencesToNewUserPreferences(existingUserPreferences)
				_, err = tx.
					NewInsert().
					Model(&newUserPreferences).
					Exec(ctx)
				if err != nil {
					return err
				}
			}

			tableName := tx.Dialect().Tables().Get(reflect.TypeOf(new(existingUserPreference))).Name
			_, err = tx.
				ExecContext(ctx, fmt.Sprintf("CREATE UNIQUE INDEX IF NOT EXISTS %s_unique_idx ON %s (preference_id, user_id)", tableName, fmt.Sprintf("%s_new", tableName)))
			if err != nil {
				return err
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

func (migration *updatePreferences) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updatePreferences) CopyOldOrgPreferencesToNewOrgPreferences(existingOrgPreferences []*existingOrgPreference) []*newOrgPreference {
	newOrgPreferences := make([]*newOrgPreference, 0)
	for _, preference := range existingOrgPreferences {
		newOrgPreferences = append(newOrgPreferences, &newOrgPreference{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			PreferenceID:    preference.PreferenceID,
			PreferenceValue: preference.PreferenceValue,
			OrgID:           preference.OrgID,
		})
	}
	return newOrgPreferences
}

func (migration *updatePreferences) CopyOldUserPreferencesToNewUserPreferences(existingUserPreferences []*existingUserPreference) []*newUserPreference {
	newUserPreferences := make([]*newUserPreference, 0)
	for _, preference := range existingUserPreferences {
		newUserPreferences = append(newUserPreferences, &newUserPreference{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			PreferenceID:    preference.PreferenceID,
			PreferenceValue: preference.PreferenceValue,
			UserID:          preference.UserID,
		})
	}
	return newUserPreferences
}
