package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addFeatures struct{}

func NewAddFeatureFlagFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_feature_flag"), newAddFeatureFlag)
}

func newAddFeatureFlag(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addFeatures{}, nil
}

func (migration *addFeatures) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addFeatures) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:feature_flag"`

			OrgID           string `bun:"org_id,type:text,notnull,unique:org_id_name"`
			Name            string `bun:"name,type:text,notnull,unique:org_id_name"`
			Description     string `bun:"description,type:text"`
			Stage           string `bun:"stage,type:text"`
			IsActive        bool   `bun:"is_active,notnull,default:false"`
			IsChanged       bool   `bun:"is_changed,notnull,default:false"`
			IsChangeable    bool   `bun:"is_changeable,notnull,default:true"`
			RequiresRestart bool   `bun:"requires_restart,notnull,default:false"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addFeatures) Down(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS feature_flag`); err != nil {
		return err
	}
	return nil
}
