package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateAgents struct {
	store sqlstore.SQLStore
}
type newAgent41 struct {
	bun.BaseModel `bun:"table:agent"`

	types.Identifiable
	types.TimeAuditable
	// AgentID is needed as the ID from opamp client is ULID and not UUID, so we are keeping it like this
	AgentID      string                 `json:"agentId" yaml:"agentId" bun:"agent_id,type:text,notnull,unique"`
	OrgID        string                 `json:"orgId" yaml:"orgId" bun:"org_id,type:text,notnull"`
	TerminatedAt time.Time              `json:"terminatedAt" yaml:"terminatedAt" bun:"terminated_at"`
	Status       opamptypes.AgentStatus `json:"currentStatus" yaml:"currentStatus" bun:"status,type:text,notnull"`
	Config       string                 `bun:"config,type:text,notnull"`
}

type existingAgentConfigVersions41 struct {
	bun.BaseModel  `bun:"table:agent_config_versions"`
	ID             string                  `bun:"id,pk,type:text"`
	CreatedBy      string                  `bun:"created_by,type:text"`
	CreatedAt      time.Time               `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy      string                  `bun:"updated_by,type:text"`
	UpdatedAt      time.Time               `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	Version        int                     `bun:"version,default:1,unique:element_version_idx"`
	Active         int                     `bun:"active"`
	IsValid        int                     `bun:"is_valid"`
	Disabled       int                     `bun:"disabled"`
	ElementType    opamptypes.ElementType  `bun:"element_type,notnull,type:varchar(120),unique:element_version_idx"`
	DeployStatus   opamptypes.DeployStatus `bun:"deploy_status,notnull,type:varchar(80),default:'DIRTY'"`
	DeploySequence int                     `bun:"deploy_sequence"`
	DeployResult   string                  `bun:"deploy_result,type:text"`
	LastHash       string                  `bun:"last_hash,type:text"`
	LastConfig     string                  `bun:"last_config,type:text"`
}

type newAgentConfigVersion41 struct {
	bun.BaseModel `bun:"table:agent_config_version"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID          string                  `json:"orgId" bun:"org_id,type:text,notnull,unique:element_version_org_idx"`
	Version        int                     `json:"version" bun:"version,unique:element_version_org_idx"`
	ElementType    opamptypes.ElementType  `json:"elementType" bun:"element_type,type:text,notnull,unique:element_version_org_idx"`
	DeployStatus   opamptypes.DeployStatus `json:"deployStatus" bun:"deploy_status,type:text,notnull,default:'dirty'"`
	DeploySequence int                     `json:"deploySequence" bun:"deploy_sequence"`
	DeployResult   string                  `json:"deployResult" bun:"deploy_result,type:text"`
	Hash           string                  `json:"lastHash" bun:"hash,type:text"`
	Config         string                  `json:"config" bun:"config,type:text"`
}

type existingAgentConfigElement41 struct {
	bun.BaseModel `bun:"table:agent_config_elements"`

	ID          string    `bun:"id,pk,type:text"`
	CreatedBy   string    `bun:"created_by,type:text"`
	CreatedAt   time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
	UpdatedBy   string    `bun:"updated_by,type:text"`
	UpdatedAt   time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
	ElementID   string    `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
	ElementType string    `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
	VersionID   string    `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
}

type newAgentConfigElement41 struct {
	bun.BaseModel `bun:"table:agent_config_element"`

	types.Identifiable
	types.TimeAuditable
	ElementID   string `bun:"element_id,type:text,notnull,unique:element_type_version_idx"`
	ElementType string `bun:"element_type,type:text,notnull,unique:element_type_version_idx"`
	VersionID   string `bun:"version_id,type:text,notnull,unique:element_type_version_idx"`
}

func NewUpdateAgentsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_agents"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateAgents(ctx, ps, c, sqlstore)
	})
}

func newUpdateAgents(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateAgents{
		store: store,
	}, nil
}

func (migration *updateAgents) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateAgents) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var orgID string
	err = tx.
		NewSelect().
		ColumnExpr("id").
		Table("organizations").
		Limit(1).
		Scan(ctx, &orgID)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
	}

	if _, err := tx.
		NewDropTable().
		IfExists().
		Table("agents").
		Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.
		NewCreateTable().
		IfNotExists().
		Model(new(newAgent41)).
		Exec(ctx); err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingAgentConfigVersions41), new(newAgentConfigVersion41), []string{OrgReference}, func(ctx context.Context) error {
			existingAgentConfigVersions := make([]*existingAgentConfigVersions41, 0)
			err = tx.
				NewSelect().
				Model(&existingAgentConfigVersions).
				Scan(ctx)
			if err != nil && err != sql.ErrNoRows {
				return err
			}

			if err == nil && len(existingAgentConfigVersions) > 0 {
				newAgentConfigVersions, err := migration.
					CopyOldAgentConfigVersionToNewAgentConfigVersion(ctx, tx, existingAgentConfigVersions, orgID)
				if err != nil {
					return err
				}
				_, err = tx.
					NewInsert().
					Model(&newAgentConfigVersions).
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

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingAgentConfigElement41), new(newAgentConfigElement41), []string{AgentConfigVersionReference}, func(ctx context.Context) error {
			existingAgentConfigElements := make([]*existingAgentConfigElement41, 0)
			err = tx.
				NewSelect().
				Model(&existingAgentConfigElements).
				Scan(ctx)
			if err != nil && err != sql.ErrNoRows {
				return err
			}

			if err == nil && len(existingAgentConfigElements) > 0 {
				newAgentConfigElements, err := migration.
					CopyOldAgentConfigElementToNewAgentConfigElement(ctx, tx, existingAgentConfigElements, orgID)
				if err != nil {
					return err
				}
				_, err = tx.
					NewInsert().
					Model(&newAgentConfigElements).
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

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateAgents) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *updateAgents) CopyOldAgentConfigVersionToNewAgentConfigVersion(ctx context.Context, tx bun.IDB, existingAgentConfigVersions []*existingAgentConfigVersions41, orgID string) ([]*newAgentConfigVersion41, error) {
	newAgentConfigVersions := make([]*newAgentConfigVersion41, 0)
	for _, existingAgentConfigVersion := range existingAgentConfigVersions {
		versionID, err := valuer.NewUUID(existingAgentConfigVersion.ID)
		if err != nil {
			return nil, err
		}
		newAgentConfigVersions = append(newAgentConfigVersions, &newAgentConfigVersion41{
			Identifiable: types.Identifiable{ID: versionID},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Unix(existingAgentConfigVersion.CreatedAt.Unix(), 0),
				UpdatedAt: time.Unix(existingAgentConfigVersion.UpdatedAt.Unix(), 0),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: existingAgentConfigVersion.CreatedBy,
				UpdatedBy: existingAgentConfigVersion.UpdatedBy,
			},
			OrgID:          orgID,
			Version:        existingAgentConfigVersion.Version,
			ElementType:    existingAgentConfigVersion.ElementType,
			DeployStatus:   existingAgentConfigVersion.DeployStatus,
			DeploySequence: existingAgentConfigVersion.DeploySequence,
			DeployResult:   existingAgentConfigVersion.DeployResult,
			Hash:           orgID + existingAgentConfigVersion.LastHash,
			Config:         existingAgentConfigVersion.LastConfig,
		})
	}
	return newAgentConfigVersions, nil
}

func (migration *updateAgents) CopyOldAgentConfigElementToNewAgentConfigElement(ctx context.Context, tx bun.IDB, existingAgentConfigElements []*existingAgentConfigElement41, orgID string) ([]*newAgentConfigElement41, error) {
	newAgentConfigElements := make([]*newAgentConfigElement41, 0)
	for _, existingAgentConfigElement := range existingAgentConfigElements {
		elementID, err := valuer.NewUUID(existingAgentConfigElement.ElementID)
		if err != nil {
			return nil, err
		}
		newAgentConfigElements = append(newAgentConfigElements, &newAgentConfigElement41{
			Identifiable: types.Identifiable{ID: elementID},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Unix(existingAgentConfigElement.CreatedAt.Unix(), 0),
				UpdatedAt: time.Unix(existingAgentConfigElement.UpdatedAt.Unix(), 0),
			},
			VersionID:   existingAgentConfigElement.VersionID,
			ElementID:   existingAgentConfigElement.ElementID,
			ElementType: existingAgentConfigElement.ElementType,
		})
	}
	return newAgentConfigElements, nil
}
