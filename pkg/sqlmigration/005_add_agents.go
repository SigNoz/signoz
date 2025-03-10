package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addAgents struct{}

func NewAddAgentsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_agents"), newAddAgents)
}

func newAddAgents(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addAgents{}, nil
}

func (migration *addAgents) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel   `bun:"table:agents"`
			AgentID         string    `bun:"agent_id,pk,type:text,unique"`
			StartedAt       time.Time `bun:"started_at,notnull"`
			TerminatedAt    time.Time `bun:"terminated_at"`
			CurrentStatus   string    `bun:"current_status,type:text,notnull"`
			EffectiveConfig string    `bun:"effective_config,type:text,notnull"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel  `bun:"table:agent_config_versions"`
			ID             string    `bun:"id,pk,type:text"`
			CreatedBy      string    `bun:"created_by,type:text"`
			CreatedAt      time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
			UpdatedBy      string    `bun:"updated_by,type:text"`
			UpdatedAt      time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
			Version        int       `bun:"version,default:1,unique:element_version_idx"`
			Active         int       `bun:"active"`
			IsValid        int       `bun:"is_valid"`
			Disabled       int       `bun:"disabled"`
			ElementType    string    `bun:"element_type,notnull,type:varchar(120),unique:element_version_idx"`
			DeployStatus   string    `bun:"deploy_status,notnull,type:varchar(80),default:'DIRTY'"`
			DeploySequence int       `bun:"deploy_sequence"`
			DeployResult   string    `bun:"deploy_result,type:text"`
			LastHash       string    `bun:"last_hash,type:text"`
			LastConfig     string    `bun:"last_config,type:text"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// add an index on the last_hash column
	if _, err := db.NewCreateIndex().
		Table("agent_config_versions").
		Column("last_hash").
		Index("idx_agent_config_versions_last_hash").
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:agent_config_elements"`

			ID          string    `bun:"id,pk,type:text"`
			CreatedBy   string    `bun:"created_by,type:text"`
			CreatedAt   time.Time `bun:"created_at,default:CURRENT_TIMESTAMP"`
			UpdatedBy   string    `bun:"updated_by,type:text"`
			UpdatedAt   time.Time `bun:"updated_at,default:CURRENT_TIMESTAMP"`
			ElementID   string    `bun:"element_id,type:text,notnull,unique:agent_config_elements_u1"`
			ElementType string    `bun:"element_type,type:varchar(120),notnull,unique:agent_config_elements_u1"`
			VersionID   string    `bun:"version_id,type:text,notnull,unique:agent_config_elements_u1"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
