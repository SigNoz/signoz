package sqlmigration

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateRules struct {
	store sqlstore.SQLStore
}

type AlertIds []string

func (a *AlertIds) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, a)
	}
	return nil
}

func (a *AlertIds) Value() (driver.Value, error) {
	return json.Marshal(a)
}

type existingRule struct {
	bun.BaseModel `bun:"table:rules"`
	ID            int       `bun:"id,pk,autoincrement"`
	CreatedAt     time.Time `bun:"created_at,type:datetime,notnull"`
	CreatedBy     string    `bun:"created_by,type:text,notnull"`
	UpdatedAt     time.Time `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy     string    `bun:"updated_by,type:text,notnull"`
	Deleted       int       `bun:"deleted,notnull,default:0"`
	Data          string    `bun:"data,type:text,notnull"`
}

type newRule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

type existingMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance"`
	ID            int                 `bun:"id,pk,autoincrement"`
	Name          string              `bun:"name,type:text,notnull"`
	Description   string              `bun:"description,type:text"`
	AlertIDs      *AlertIds           `bun:"alert_ids,type:text"`
	Schedule      *ruletypes.Schedule `bun:"schedule,type:text,notnull"`
	CreatedAt     time.Time           `bun:"created_at,type:datetime,notnull"`
	CreatedBy     string              `bun:"created_by,type:text,notnull"`
	UpdatedAt     time.Time           `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy     string              `bun:"updated_by,type:text,notnull"`
}

type newMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance_new"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Name        string              `bun:"name,type:text,notnull"`
	Description string              `bun:"description,type:text"`
	Schedule    *ruletypes.Schedule `bun:"schedule,type:text,notnull"`
	OrgID       string              `bun:"org_id,type:text"`
}

type storablePlannedMaintenanceRule struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`
	types.Identifiable
	PlannedMaintenanceID valuer.UUID `bun:"planned_maintenance_id,type:text"`
	RuleID               valuer.UUID `bun:"rule_id,type:text"`
}

type ruleHistory struct {
	bun.BaseModel `bun:"table:rule_history"`
	RuleID        int         `bun:"rule_id"`
	RuleUUID      valuer.UUID `bun:"rule_uuid"`
}

func NewUpdateRulesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_rules"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateRules(ctx, ps, c, sqlstore)
	})
}

func newUpdateRules(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateRules{store: store}, nil
}

func (migration *updateRules) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateRules) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	ruleIDToRuleUUIDMap := map[int]valuer.UUID{}
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingRule), new(newRule), []string{OrgReference}, func(ctx context.Context) error {
			existingRules := make([]*existingRule, 0)
			err := tx.
				NewSelect().
				Model(&existingRules).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}
			if err == nil && len(existingRules) > 0 {
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
					newRules, idUUIDMap := migration.CopyExistingRulesToNewRules(existingRules, orgID)
					ruleIDToRuleUUIDMap = idUUIDMap
					_, err = tx.
						NewInsert().
						Model(&newRules).
						Exec(ctx)
					if err != nil {
						return err
					}
				}
			}
			err = migration.store.Dialect().UpdatePrimaryKey(ctx, tx, new(existingMaintenance), new(newMaintenance), OrgReference, func(ctx context.Context) error {
				_, err := tx.
					NewCreateTable().
					IfNotExists().
					Model(new(storablePlannedMaintenanceRule)).
					ForeignKey(`("planned_maintenance_id") REFERENCES "planned_maintenance_new" ("id") ON DELETE CASCADE ON UPDATE CASCADE`).
					ForeignKey(`("rule_id") REFERENCES "rule" ("id")`).
					Exec(ctx)
				if err != nil {
					return err
				}

				existingMaintenances := make([]*existingMaintenance, 0)
				err = tx.
					NewSelect().
					Model(&existingMaintenances).
					Scan(ctx)
				if err != nil {
					if err != sql.ErrNoRows {
						return err
					}
				}
				if err == nil && len(existingMaintenances) > 0 {
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
						newMaintenances, newMaintenancesRules, err := migration.CopyExistingMaintenancesToNewMaintenancesAndRules(existingMaintenances, orgID, ruleIDToRuleUUIDMap)
						if err != nil {
							return err
						}

						_, err = tx.
							NewInsert().
							Model(&newMaintenances).
							Exec(ctx)
						if err != nil {
							return err
						}

						if len(newMaintenancesRules) > 0 {
							_, err = tx.
								NewInsert().
								Model(&newMaintenancesRules).
								Exec(ctx)
							if err != nil {
								return err
							}
						}

					}

				}
				return nil
			})
			if err != nil {
				return err
			}

			ruleHistories := make([]*ruleHistory, 0)
			for ruleID, ruleUUID := range ruleIDToRuleUUIDMap {
				ruleHistories = append(ruleHistories, &ruleHistory{
					RuleID:   ruleID,
					RuleUUID: ruleUUID,
				})
			}

			_, err = tx.
				NewCreateTable().
				IfNotExists().
				Model(&ruleHistories).
				Exec(ctx)
			if err != nil {
				return err
			}
			if len(ruleHistories) > 0 {
				_, err = tx.
					NewInsert().
					Model(&ruleHistories).
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

func (migration *updateRules) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateRules) CopyExistingRulesToNewRules(existingRules []*existingRule, orgID string) ([]*newRule, map[int]valuer.UUID) {
	newRules := make([]*newRule, 0)
	idUUIDMap := map[int]valuer.UUID{}
	for _, rule := range existingRules {
		uuid := valuer.GenerateUUID()
		idUUIDMap[rule.ID] = uuid
		newRules = append(newRules, &newRule{
			Identifiable: types.Identifiable{
				ID: uuid,
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: rule.CreatedAt,
				UpdatedAt: rule.UpdatedAt,
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: rule.CreatedBy,
				UpdatedBy: rule.UpdatedBy,
			},
			Deleted: rule.Deleted,
			Data:    rule.Data,
			OrgID:   orgID,
		})
	}
	return newRules, idUUIDMap
}

func (migration *updateRules) CopyExistingMaintenancesToNewMaintenancesAndRules(existingMaintenances []*existingMaintenance, orgID string, ruleIDToRuleUUIDMap map[int]valuer.UUID) ([]*newMaintenance, []*storablePlannedMaintenanceRule, error) {
	newMaintenances := make([]*newMaintenance, 0)
	newMaintenanceRules := make([]*storablePlannedMaintenanceRule, 0)

	for _, maintenance := range existingMaintenances {
		ruleIDs := maintenance.AlertIDs
		maintenanceUUID := valuer.GenerateUUID()
		newMaintenance := newMaintenance{
			Identifiable: types.Identifiable{
				ID: maintenanceUUID,
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: maintenance.CreatedAt,
				UpdatedAt: maintenance.UpdatedAt,
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: maintenance.CreatedBy,
				UpdatedBy: maintenance.UpdatedBy,
			},
			Name:        maintenance.Name,
			Description: maintenance.Description,
			Schedule:    maintenance.Schedule,
			OrgID:       orgID,
		}
		newMaintenances = append(newMaintenances, &newMaintenance)
		for _, ruleIDStr := range *ruleIDs {
			ruleID, err := strconv.Atoi(ruleIDStr)
			if err != nil {
				return nil, nil, err
			}

			newMaintenanceRules = append(newMaintenanceRules, &storablePlannedMaintenanceRule{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				PlannedMaintenanceID: maintenanceUUID,
				RuleID:               ruleIDToRuleUUIDMap[ruleID],
			})
		}
	}
	return newMaintenances, newMaintenanceRules, nil
}
