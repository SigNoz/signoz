package agentConf

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
)

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	db *sqlx.DB
}

func (r *Repo) GetConfigHistory(
	ctx context.Context, typ ElementTypeDef, limit int,
) ([]ConfigVersion, *model.ApiError) {
	var c []ConfigVersion
	err := r.db.SelectContext(ctx, &c, fmt.Sprintf(`SELECT 
		version, 
		id, 
		element_type, 
		COALESCE(created_by, -1) as created_by, 
		created_at,
		COALESCE((SELECT NAME FROM users 
 		WHERE id = v.created_by), "unknown") created_by_name, 
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result,
		coalesce(last_hash, '') as last_hash,
		coalesce(last_config, '{}') as last_config
		FROM agent_config_versions AS v
		WHERE element_type = $1
		ORDER BY created_at desc, version desc
		limit %v`, limit),
		typ)

	if err != nil {
		return nil, model.InternalError(err)
	}

	incompleteStatuses := []DeployStatus{DeployInitiated, Deploying}
	for idx := 1; idx < len(c); idx++ {
		if slices.Contains(incompleteStatuses, c[idx].DeployStatus) {
			c[idx].DeployStatus = DeployStatusUnknown
		}
	}

	return c, nil
}

func (r *Repo) GetConfigVersion(
	ctx context.Context, typ ElementTypeDef, v int,
) (*ConfigVersion, *model.ApiError) {
	var c ConfigVersion
	err := r.db.GetContext(ctx, &c, `SELECT 
		id, 
		version, 
		element_type,
		COALESCE(created_by, -1) as created_by, 
		created_at,
		COALESCE((SELECT NAME FROM users 
		WHERE id = v.created_by), "unknown") created_by_name,
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result,
		coalesce(last_hash, '') as last_hash,
		coalesce(last_config, '{}') as last_config
		FROM agent_config_versions v 
		WHERE element_type = $1 
		AND version = $2`, typ, v)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(err)
	}
	if err != nil {
		return nil, model.InternalError(err)
	}

	return &c, nil
}

func (r *Repo) GetLatestVersion(
	ctx context.Context, typ ElementTypeDef,
) (*ConfigVersion, *model.ApiError) {
	var c ConfigVersion
	err := r.db.GetContext(ctx, &c, `SELECT 
		id, 
		version, 
		element_type, 
		COALESCE(created_by, -1) as created_by, 
		created_at,
		COALESCE((SELECT NAME FROM users 
 		WHERE id = v.created_by), "unknown") created_by_name, 
		active, 
		is_valid, 
		disabled, 
		deploy_status, 
		deploy_result 
		FROM agent_config_versions AS v
		WHERE element_type = $1 
		AND version = ( 
			SELECT MAX(version) 
			FROM agent_config_versions 
			WHERE element_type=$2)`, typ, typ)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(err)
	}
	if err != nil {
		return nil, model.InternalError(err)
	}

	return &c, nil
}

func (r *Repo) insertConfig(
	ctx context.Context, userId string, c *ConfigVersion, elements []string,
) (fnerr *model.ApiError) {

	if string(c.ElementType) == "" {
		return model.BadRequest(fmt.Errorf(
			"element type is required for creating agent config version",
		))
	}

	// allowing empty elements for logs - use case is deleting all pipelines
	if len(elements) == 0 && c.ElementType != ElementTypeLogPipelines {
		zap.L().Error("insert config called with no elements ", zap.String("ElementType", string(c.ElementType)))
		return model.BadRequest(fmt.Errorf("config must have atleast one element"))
	}

	if c.Version != 0 {
		// the version can not be set by the user, we want to auto-assign the versions
		// in a monotonically increasing order starting with 1. hence, we reject insert
		// requests with version anything other than 0. here, 0 indicates un-assigned
		zap.L().Error("invalid version assignment while inserting agent config", zap.Int("version", c.Version), zap.String("ElementType", string(c.ElementType)))
		return model.BadRequest(fmt.Errorf(
			"user defined versions are not supported in the agent config",
		))
	}

	configVersion, err := r.GetLatestVersion(ctx, c.ElementType)
	if err != nil && err.Type() != model.ErrorNotFound {
		zap.L().Error("failed to fetch latest config version", zap.Error(err))
		return model.InternalError(fmt.Errorf("failed to fetch latest config version"))
	}

	if configVersion != nil {
		c.Version = updateVersion(configVersion.Version)
	} else {
		// first version
		c.Version = 1
	}

	defer func() {
		if fnerr != nil {
			// remove all the damage (invalid rows from db)
			r.db.Exec("DELETE FROM agent_config_versions WHERE id = $1", c.ID)
			r.db.Exec("DELETE FROM agent_config_elements WHERE version_id=$1", c.ID)
		}
	}()

	// insert config
	configQuery := `INSERT INTO agent_config_versions(	
		id, 
		version, 
		created_by,
		element_type, 
		active, 
		is_valid, 
		disabled,
		deploy_status, 
		deploy_result) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, dbErr := r.db.ExecContext(ctx,
		configQuery,
		c.ID,
		c.Version,
		userId,
		c.ElementType,
		false,
		false,
		false,
		c.DeployStatus,
		c.DeployResult)

	if dbErr != nil {
		zap.L().Error("error in inserting config version: ", zap.Error(dbErr))
		return model.InternalError(errors.Wrap(dbErr, "failed to insert ingestion rule"))
	}

	elementsQuery := `INSERT INTO agent_config_elements(	
		id, 
		version_id, 
		element_type, 
		element_id) 
	VALUES ($1, $2, $3, $4)`

	for _, e := range elements {
		_, dbErr = r.db.ExecContext(
			ctx,
			elementsQuery,
			uuid.NewString(),
			c.ID,
			c.ElementType,
			e,
		)
		if dbErr != nil {
			return model.InternalError(dbErr)
		}
	}

	return nil
}

func (r *Repo) updateDeployStatus(ctx context.Context,
	elementType ElementTypeDef,
	version int,
	status string,
	result string,
	lastHash string,
	lastconf string) *model.ApiError {

	updateQuery := `UPDATE agent_config_versions
	set deploy_status = $1, 
	deploy_result = $2,
	last_hash = COALESCE($3, last_hash),
	last_config = $4
	WHERE version=$5
	AND element_type = $6`

	_, err := r.db.ExecContext(ctx, updateQuery, status, result, lastHash, lastconf, version, string(elementType))
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return model.BadRequest(fmt.Errorf("failed to  update deploy status"))
	}

	return nil
}

func (r *Repo) updateDeployStatusByHash(
	ctx context.Context, confighash string, status string, result string,
) *model.ApiError {

	updateQuery := `UPDATE agent_config_versions
	set deploy_status = $1, 
	deploy_result = $2
	WHERE last_hash=$4`

	_, err := r.db.ExecContext(ctx, updateQuery, status, result, confighash)
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return model.InternalError(errors.Wrap(err, "failed to update deploy status"))
	}

	return nil
}
