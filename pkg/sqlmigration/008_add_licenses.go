package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addLicenses struct{}

func NewAddLicensesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_licenses"), newAddLicenses)
}

func newAddLicenses(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addLicenses{}, nil
}

func (migration *addLicenses) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel     `bun:"table:licenses"`
			Key               string    `bun:"key,pk,type:text"`
			CreatedAt         time.Time `bun:"createdAt,default:current_timestamp"`
			UpdatedAt         time.Time `bun:"updatedAt,default:current_timestamp"`
			PlanDetails       string    `bun:"planDetails,type:text"`
			ActivationID      string    `bun:"activationId,type:text"`
			ValidationMessage string    `bun:"validationMessage,type:text"`
			LastValidated     time.Time `bun:"lastValidated,default:current_timestamp"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:sites"`

			UUID      string    `bun:"uuid,pk,type:text"`
			Alias     string    `bun:"alias,type:varchar(180),default:'PROD'"`
			URL       string    `bun:"url,type:varchar(300)"`
			CreatedAt time.Time `bun:"createdAt,default:current_timestamp"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:feature_status"`
			Name          string `bun:"name,pk,type:text"`
			Active        bool   `bun:"active"`
			Usage         int    `bun:"usage,default:0"`
			UsageLimit    int    `bun:"usage_limit,default:0"`
			Route         string `bun:"route,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:licenses_v3"`
			ID            string `bun:"id,pk,type:text"`
			Key           string `bun:"key,type:text,notnull,unique"`
			Data          string `bun:"data,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
