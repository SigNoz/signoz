package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateLicense struct {
	store sqlstore.SQLStore
}

type existingLicense34 struct {
	bun.BaseModel `bun:"table:licenses_v3"`

	ID   string `bun:"id,pk,type:text"`
	Key  string `bun:"key,type:text,notnull,unique"`
	Data string `bun:"data,type:text"`
}

type newLicense34 struct {
	bun.BaseModel `bun:"table:license"`

	types.Identifiable
	types.TimeAuditable
	Key             string         `bun:"key,type:text,notnull,unique"`
	Data            map[string]any `bun:"data,type:text"`
	LastValidatedAt time.Time      `bun:"last_validated_at,notnull"`
	OrgID           string         `bun:"org_id,type:text,notnull" json:"orgID"`
}

func NewUpdateLicenseFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_license"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateLicense(ctx, ps, c, store)
	})
}

func newUpdateLicense(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateLicense{store: store}, nil
}

func (migration *updateLicense) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateLicense) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	err = migration.store.Dialect().RenameTableAndModifyModel(ctx, tx, new(existingLicense34), new(newLicense34), []string{OrgReference}, func(ctx context.Context) error {
		existingLicenses := make([]*existingLicense34, 0)
		err = tx.NewSelect().Model(&existingLicenses).Scan(ctx)
		if err != nil {
			if err != sql.ErrNoRows {
				return err
			}
		}

		if err == nil && len(existingLicenses) > 0 {
			var orgID string
			err := migration.
				store.
				BunDB().
				NewSelect().
				Model((*types.Organization)(nil)).
				Column("id").
				Scan(ctx, &orgID)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}
			if err == nil {
				newLicenses, err := migration.CopyExistingLicensesToNewLicenses(existingLicenses, orgID)
				if err != nil {
					return err
				}
				_, err = tx.
					NewInsert().
					Model(&newLicenses).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		}
		return nil
	})

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateLicense) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateLicense) CopyExistingLicensesToNewLicenses(existingLicenses []*existingLicense34, orgID string) ([]*newLicense34, error) {
	newLicenses := make([]*newLicense34, len(existingLicenses))
	for idx, existingLicense := range existingLicenses {
		licenseID, err := valuer.NewUUID(existingLicense.ID)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "license id is not a valid UUID: %s", existingLicense.ID)
		}
		licenseData := map[string]any{}
		err = json.Unmarshal([]byte(existingLicense.Data), &licenseData)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "unable to unmarshal license data in map[string]any")
		}
		newLicenses[idx] = &newLicense34{
			Identifiable: types.Identifiable{
				ID: licenseID,
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			Key:             existingLicense.Key,
			Data:            licenseData,
			LastValidatedAt: time.Now(),
			OrgID:           orgID,
		}
	}
	return newLicenses, nil
}
