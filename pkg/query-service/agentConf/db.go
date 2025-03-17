package agentConf

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
)

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	db *bun.DB
}

func (r *Repo) GetConfigHistory(
	ctx context.Context, typ types.ElementTypeDef, limit int,
) ([]types.AgentConfigVersion, *model.ApiError) {
	var c []types.AgentConfigVersion
	err := r.db.NewSelect().
		Model(&c).
		ColumnExpr("version, id, element_type, COALESCE(created_by, -1) as created_by, created_at").
		ColumnExpr(`COALESCE((SELECT NAME FROM users WHERE id = v.created_by), 'unknown') as created_by_name`).
		ColumnExpr("active, is_valid, disabled, deploy_status, deploy_result").
		ColumnExpr("coalesce(last_hash, '') as last_hash, coalesce(last_config, '{}') as last_config").
		TableExpr("agent_config_versions AS v").
		Where("element_type = ?", typ).
		OrderExpr("created_at DESC, version DESC").
		Limit(limit).
		Scan(ctx)

	if err != nil {
		return nil, model.InternalError(err)
	}

	incompleteStatuses := []types.DeployStatus{types.DeployInitiated, types.Deploying}
	for idx := 1; idx < len(c); idx++ {
		if slices.Contains(incompleteStatuses, c[idx].DeployStatus) {
			c[idx].DeployStatus = types.DeployStatusUnknown
		}
	}

	return c, nil
}

func (r *Repo) GetConfigVersion(
	ctx context.Context, typ types.ElementTypeDef, v int,
) (*types.AgentConfigVersion, *model.ApiError) {
	var c types.AgentConfigVersion
	err := r.db.NewSelect().
		Model(&c).
		ColumnExpr("id, version, element_type").
		ColumnExpr("COALESCE(created_by, -1) as created_by").
		ColumnExpr("created_at").
		ColumnExpr(`COALESCE((SELECT NAME FROM users WHERE id = v.created_by), 'unknown') as created_by_name`).
		ColumnExpr("active, is_valid, disabled, deploy_status, deploy_result").
		ColumnExpr("coalesce(last_hash, '') as last_hash").
		ColumnExpr("coalesce(last_config, '{}') as last_config").
		TableExpr("agent_config_versions AS v").
		Where("element_type = ?", typ).
		Where("version = ?", v).
		Scan(ctx)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, model.NotFoundError(err)
		}
		return nil, model.InternalError(err)
	}

	return &c, nil
}

func (r *Repo) GetLatestVersion(
	ctx context.Context, typ types.ElementTypeDef,
) (*types.AgentConfigVersion, *model.ApiError) {
	var c types.AgentConfigVersion
	err := r.db.NewSelect().
		Model(&c).
		ColumnExpr("id, version, element_type").
		ColumnExpr("COALESCE(created_by, -1) as created_by").
		ColumnExpr("created_at").
		ColumnExpr(`COALESCE((SELECT NAME FROM users WHERE id = v.created_by), 'unknown') as created_by_name`).
		ColumnExpr("active, is_valid, disabled, deploy_status, deploy_result").
		TableExpr("agent_config_versions AS v").
		Where("element_type = ?", typ).
		Where("version = (SELECT MAX(version) FROM agent_config_versions WHERE element_type = ?)", typ).
		Scan(ctx)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, model.NotFoundError(err)
		}
		return nil, model.InternalError(err)
	}

	return &c, nil
}

func (r *Repo) insertConfig(
	ctx context.Context, userId string, c *types.AgentConfigVersion, elements []string,
) (fnerr *model.ApiError) {

	if string(c.ElementType) == "" {
		return model.BadRequest(fmt.Errorf(
			"element type is required for creating agent config version",
		))
	}

	// allowing empty elements for logs - use case is deleting all pipelines
	if len(elements) == 0 && c.ElementType != types.ElementTypeLogPipelines {
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
		c.Version = types.UpdateVersion(configVersion.Version)
	} else {
		// first version
		c.Version = 1
	}

	defer func() {
		if fnerr != nil {
			// remove all the damage (invalid rows from db)
			r.db.NewDelete().Model((*types.AgentConfigVersion)(nil)).Where("id = ?", c.ID).Exec(ctx)
			r.db.NewDelete().Model((*types.AgentConfigElement)(nil)).Where("version_id = ?", c.ID).Exec(ctx)
		}
	}()

	// insert config
	_, dbErr := r.db.NewInsert().
		Model(&types.AgentConfigVersion{
			ID:      c.ID,
			Version: c.Version,
			UserAuditable: types.UserAuditable{
				CreatedBy: userId,
			},
			ElementType:  c.ElementType,
			Active:       false, // default value
			IsValid:      false, // default value
			Disabled:     false, // default value
			DeployStatus: c.DeployStatus,
			DeployResult: c.DeployResult,
		}).
		Exec(ctx)

	if dbErr != nil {
		zap.L().Error("error in inserting config version: ", zap.Error(dbErr))
		return model.InternalError(errors.Wrap(dbErr, "failed to insert ingestion rule"))
	}

	for _, e := range elements {
		agentConfigElement := &types.AgentConfigElement{
			ID:          uuid.NewString(),
			VersionID:   c.ID,
			ElementType: string(c.ElementType),
			ElementID:   e,
		}
		_, dbErr = r.db.NewInsert().Model(agentConfigElement).Exec(ctx)
		if dbErr != nil {
			return model.InternalError(dbErr)
		}
	}

	return nil
}

func (r *Repo) updateDeployStatus(ctx context.Context,
	elementType types.ElementTypeDef,
	version int,
	status string,
	result string,
	lastHash string,
	lastconf string) *model.ApiError {

	_, err := r.db.NewUpdate().
		Model((*types.AgentConfigVersion)(nil)).
		Set("deploy_status = ?", status).
		Set("deploy_result = ?", result).
		Set("last_hash = COALESCE(?, last_hash)", lastHash).
		Set("last_config = ?", lastconf).
		Where("version = ?", version).
		Where("element_type = ?", elementType).
		Exec(ctx)
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return model.BadRequest(fmt.Errorf("failed to update deploy status"))
	}

	return nil
}

func (r *Repo) updateDeployStatusByHash(
	ctx context.Context, confighash string, status string, result string,
) *model.ApiError {

	_, err := r.db.NewUpdate().
		Model((*types.AgentConfigVersion)(nil)).
		Set("deploy_status = ?", status).
		Set("deploy_result = ?", result).
		Where("last_hash = ?", confighash).
		Exec(ctx)
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return model.InternalError(errors.Wrap(err, "failed to update deploy status"))
	}

	return nil
}
