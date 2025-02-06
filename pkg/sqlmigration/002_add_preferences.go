package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types"
)

type addPreferences struct{}

func NewAddPreferencesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_preferences"), newAddPreferences)
}

func newAddPreferences(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPreferences{}, nil
}

func (migration *addPreferences) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPreferences) Up(ctx context.Context, db *bun.DB) error {
	// table:user_preference
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel   `bun:"table:user_preference"`
			PreferenceID    string      `bun:"preference_id,type:text,notnull"`
			PreferenceValue string      `bun:"preference_value,type:text,notnull"`
			UserID          string      `bun:"user_id,type:text,notnull"`
			User            *types.User `bun:"rel:belongs-to,join:user_id=id,pk,on_delete:CASCADE,on_update:CASCADE"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:org_preference
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel   `bun:"table:org_preference"`
			PreferenceID    string              `bun:"preference_id,type:text,notnull"`
			PreferenceValue string              `bun:"preference_value,type:text,notnull"`
			OrgID           string              `bun:"org_id,type:text,notnull"`
			Org             *types.Organization `bun:"rel:belongs-to,join:org_id=id,pk,on_delete:CASCADE,on_update:CASCADE"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPreferences) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
