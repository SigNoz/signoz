package sqlmigration

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateDashboard struct {
	store sqlstore.SQLStore
}

type dashboardData map[string]interface{}

func (c dashboardData) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *dashboardData) Scan(src interface{}) error {
	var data []byte
	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	}
	return json.Unmarshal(data, c)
}

type existingDashboard36 struct {
	bun.BaseModel `bun:"table:dashboards"`

	types.TimeAuditable
	types.UserAuditable
	OrgID  string        `json:"-" bun:"org_id,notnull"`
	ID     int           `json:"id" bun:"id,pk,autoincrement"`
	UUID   string        `json:"uuid" bun:"uuid,type:text,notnull,unique"`
	Data   dashboardData `json:"data" bun:"data,type:text,notnull"`
	Locked *int          `json:"isLocked" bun:"locked,notnull,default:0"`
}

type storableDashboardData map[string]interface{}

func (storableDashboardData *storableDashboardData) Scan(src interface{}) error {
	var data []byte
	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	}
	return json.Unmarshal(data, storableDashboardData)
}

func (storableDashboardData *storableDashboardData) Value() (driver.Value, error) {
	return json.Marshal(storableDashboardData)
}

type newDashboard36 struct {
	bun.BaseModel `bun:"table:dashboard"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Data   storableDashboardData `json:"data" bun:"data,type:text,notnull"`
	Locked bool                  `json:"isLocked" bun:"locked,notnull,default:0"`
	OrgID  valuer.UUID           `json:"-" bun:"org_id,notnull"`
}

func NewUpdateDashboardFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_dashboards"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateDashboard(ctx, ps, c, store)
	})
}

func newUpdateDashboard(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateDashboard{store: store}, nil
}

func (migration *updateDashboard) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateDashboard) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	migration.store.Dialect().RenameTableAndModifyModel(ctx, tx, new(existingDashboard36), new(newDashboard36), []string{OrgReference}, func(ctx context.Context) error {
		existingDashboards := make([]*existingDashboard36, 0)
		err = tx.NewSelect().Model(&existingDashboards).Scan(ctx)
		if err != nil {
			if err != sql.ErrNoRows {
				return err
			}
		}

		if err == nil && len(existingDashboards) > 0 {
			newDashboards, err := migration.CopyExistingDashboardsToNewDashboards(existingDashboards)
			if err != nil {
				return err
			}
			_, err = tx.
				NewInsert().
				Model(&newDashboards).
				Exec(ctx)
			if err != nil {
				return err
			}
		}

		return nil
	})

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil

}
func (migration *updateDashboard) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateDashboard) CopyExistingDashboardsToNewDashboards(existingDashboards []*existingDashboard36) ([]*newDashboard36, error) {
	newDashboards := make([]*newDashboard36, len(existingDashboards))

	for idx, existingDashboard := range existingDashboards {
		dashboardID, err := valuer.NewUUID(existingDashboard.UUID)
		if err != nil {
			return nil, err
		}
		orgID, err := valuer.NewUUID(existingDashboard.OrgID)
		if err != nil {
			return nil, err
		}
		locked := false
		if existingDashboard.Locked != nil && *existingDashboard.Locked == 1 {
			locked = true
		}

		newDashboards[idx] = &newDashboard36{
			Identifiable: types.Identifiable{
				ID: dashboardID,
			},
			TimeAuditable: existingDashboard.TimeAuditable,
			UserAuditable: existingDashboard.UserAuditable,
			Data:          storableDashboardData(existingDashboard.Data),
			Locked:        locked,
			OrgID:         orgID,
		}
	}

	return newDashboards, nil
}
