package pipelines

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/ee/query-service/pipelines/sqlite"
	"go.uber.org/zap"
)

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	db *sqlx.DB
}

// NewRepo initiates a new ingestion repo
func NewRepo(db *sqlx.DB) Repo {
	return Repo{
		db: db,
	}
}

func (r *Repo) InitDB(engine string) error {
	switch engine {
	case "sqlite3", "sqlite":
		return sqlite.InitDB(r.db)
	default:
		return fmt.Errorf("unsupported db")
	}
}

// InsertRule stores a given postable rule to database
func (r *Repo) insertPipeline(ctx context.Context, postable *PostablePipeline) (*model.Pipeline, error) {
	if err := postable.IsValid(); err != nil {
		return nil, errors.Wrap(err, "failed to validate postable ingestion rule")
	}

	rawConfig, err := json.Marshal(postable.Config)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal postable ingestion config")
	}

	insertRow := &model.Pipeline{
		Id:        uuid.New().String(),
		OrderId:   postable.OrderId,
		Enabled:   postable.Enabled,
		Name:      postable.Name,
		Alias:     postable.Alias,
		Filter:    postable.Filter,
		Config:    postable.Config,
		RawConfig: string(rawConfig),
	}

	insertQuery := `INSERT INTO pipelines 
	(id, order_id, enabled, name, alias, filter, config_json) 
	VALUES ($1, $2, $3, $4, $5, %6, $7)`

	_, err = r.db.ExecContext(ctx,
		insertQuery,
		insertRow.Id,
		insertRow.OrderId,
		insertRow.Enabled,
		insertRow.Name,
		insertRow.Alias,
		insertRow.Filter,
		insertRow.RawConfig)

	if err != nil {
		zap.S().Errorf("error in inserting ingestion rule data: ", zap.Error(err))
		return insertRow, errors.Wrap(err, "failed to insert ingestion rule")
	}

	return insertRow, nil
}

// getPipelinesByVersion returns pipelines associated with a given version
func (r *Repo) getPipelinesByVersion(ctx context.Context, version int) ([]model.Pipeline, []error) {
	var errors []error
	rules := []model.Pipeline{}

	versionQuery := `SELECT r.id, 
		name, 
		config_json, 
		deployment_status, 
		deployment_sequence 
		FROM pipelines r,
			 agent_config_elements e,
			 agent_config_versions v
		WHERE r.id = e.element_id
		AND v.id = e.version_id
		AND e.element_type = 'pipeline'
		AND v.version = $1`

	err := r.db.SelectContext(ctx, &rules, versionQuery, version)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to get drop rules from db: %v", err)}
	}

	if len(rules) == 0 {
		return rules, nil
	}

	for _, d := range rules {
		if err := d.ParseRawConfig(); err != nil {
			errors = append(errors, err)
		}
	}

	return rules, errors
}

// GetRule returns rules and errors (if any)
func (r *Repo) GetPipeline(ctx context.Context, id string) (*model.Pipeline, *model.ApiError) {
	rules := []model.Pipeline{}

	ruleQuery := `SELECT id, 
		name, 
		config_json, 
		deployment_status, 
		deployment_sequence  
		FROM pipelines 
		WHERE id = $1`

	err := r.db.SelectContext(ctx, &rules, ruleQuery, id)
	if err != nil {
		zap.S().Errorf("failed to get ingestion rule from db", err)
		return nil, model.BadRequestStr("failed to get ingestion rule from db")
	}

	if len(rules) == 0 {
		zap.S().Warnf("No row found for ingestion rule id", id)
		return nil, nil
	}

	// if len(rules) == 1 {
	// 	err := rules[0].ParseRawConfig()
	// 	if err != nil {
	// 		zap.S().Errorf("invalid rule config found", id, err)
	// 		return &rules[0], model.InternalErrorStr("found an invalid rule config ")
	// 	}
	// 	return &rules[0], nil
	// }

	return nil, model.InternalErrorStr("mutliple rules with same id")

}

func (r *Repo) DeletePipeline(ctx context.Context, id string) *model.ApiError {
	deleteQuery := `DELETE
		FROM ingestion_rules 
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, deleteQuery, id)
	if err != nil {
		return model.BadRequest(err)
	}

	return nil

}
