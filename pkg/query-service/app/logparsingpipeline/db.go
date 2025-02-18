package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

// Repo handles DDL and DML ops on ingestion pipeline
type Repo struct {
	db *sqlx.DB
}

const logPipelines = "log_pipelines"

// NewRepo initiates a new ingestion repo
func NewRepo(db *sqlx.DB) Repo {
	return Repo{
		db: db,
	}
}

// insertPipeline stores a given postable pipeline to database
func (r *Repo) insertPipeline(
	ctx context.Context, postable *PostablePipeline,
) (*Pipeline, *model.ApiError) {
	if err := postable.IsValid(); err != nil {
		return nil, model.BadRequest(errors.Wrap(err,
			"pipeline is not valid",
		))
	}

	rawConfig, err := json.Marshal(postable.Config)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err,
			"failed to unmarshal postable pipeline config",
		))
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, model.UnauthorizedError(fmt.Errorf("failed to get email from context"))
	}

	insertRow := &Pipeline{
		Id:          uuid.New().String(),
		OrderId:     postable.OrderId,
		Enabled:     postable.Enabled,
		Name:        postable.Name,
		Alias:       postable.Alias,
		Description: &postable.Description,
		Filter:      postable.Filter,
		Config:      postable.Config,
		RawConfig:   string(rawConfig),
		Creator: Creator{
			CreatedBy: claims.Email,
			CreatedAt: time.Now(),
		},
	}

	insertQuery := `INSERT INTO pipelines 
	(id, order_id, enabled, created_by, created_at, name, alias, description, filter, config_json) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err = r.db.ExecContext(ctx,
		insertQuery,
		insertRow.Id,
		insertRow.OrderId,
		insertRow.Enabled,
		insertRow.Creator.CreatedBy,
		insertRow.Creator.CreatedAt,
		insertRow.Name,
		insertRow.Alias,
		insertRow.Description,
		insertRow.Filter,
		insertRow.RawConfig)

	if err != nil {
		zap.L().Error("error in inserting pipeline data", zap.Error(err))
		return nil, model.InternalError(errors.Wrap(err, "failed to insert pipeline"))
	}

	return insertRow, nil
}

// getPipelinesByVersion returns pipelines associated with a given version
func (r *Repo) getPipelinesByVersion(
	ctx context.Context, version int,
) ([]Pipeline, []error) {
	var errors []error
	pipelines := []Pipeline{}

	versionQuery := `SELECT r.id, 
		r.name, 
		r.config_json,
		r.alias,
		r.description,
		r.filter,
		r.order_id,
		r.created_by,
		r.created_at,
		r.enabled
		FROM pipelines r,
			 agent_config_elements e,
			 agent_config_versions v
		WHERE r.id = e.element_id
		AND v.id = e.version_id
		AND e.element_type = $1
		AND v.version = $2
		ORDER BY order_id asc`

	err := r.db.SelectContext(ctx, &pipelines, versionQuery, logPipelines, version)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to get drop pipelines from db: %v", err)}
	}

	if len(pipelines) == 0 {
		return pipelines, nil
	}

	for i := range pipelines {
		if err := pipelines[i].ParseRawConfig(); err != nil {
			errors = append(errors, err)
		}
	}

	return pipelines, errors
}

// GetPipelines returns pipeline and errors (if any)
func (r *Repo) GetPipeline(
	ctx context.Context, id string,
) (*Pipeline, *model.ApiError) {
	pipelines := []Pipeline{}

	pipelineQuery := `SELECT id, 
		name, 
		config_json,
		alias,
		description,
		filter,
		order_id,
		created_by,
		created_at,
		enabled
		FROM pipelines 
		WHERE id = $1`

	err := r.db.SelectContext(ctx, &pipelines, pipelineQuery, id)
	if err != nil {
		zap.L().Error("failed to get ingestion pipeline from db", zap.Error(err))
		return nil, model.InternalError(errors.Wrap(err, "failed to get ingestion pipeline from db"))
	}

	if len(pipelines) == 0 {
		zap.L().Warn("No row found for ingestion pipeline id", zap.String("id", id))
		return nil, model.NotFoundError(fmt.Errorf("no row found for ingestion pipeline id %v", id))
	}

	if len(pipelines) == 1 {
		err := pipelines[0].ParseRawConfig()
		if err != nil {
			zap.L().Error("invalid pipeline config found", zap.String("id", id), zap.Error(err))
			return nil, model.InternalError(
				errors.Wrap(err, "found an invalid pipeline config"),
			)
		}
		return &pipelines[0], nil
	}

	return nil, model.InternalError(fmt.Errorf("multiple pipelines with same id"))
}

func (r *Repo) DeletePipeline(ctx context.Context, id string) error {
	deleteQuery := `DELETE
		FROM pipelines 
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, deleteQuery, id)
	if err != nil {
		return model.BadRequest(err)
	}

	return nil

}
