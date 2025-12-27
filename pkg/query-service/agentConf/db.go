package agentConf

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
)

var (
	CodeConfigVersionNotFound          = errors.MustNewCode("config_version_not_found")
	CodeElementTypeRequired            = errors.MustNewCode("element_type_required")
	CodeConfigElementsRequired         = errors.MustNewCode("config_elements_required")
	CodeConfigVersionInsertFailed      = errors.MustNewCode("config_version_insert_failed")
	CodeConfigElementInsertFailed      = errors.MustNewCode("config_element_insert_failed")
	CodeConfigDeployStatusUpdateFailed = errors.MustNewCode("config_deploy_status_update_failed")
	CodeConfigHistoryGetFailed         = errors.MustNewCode("config_history_get_failed")
)

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	store sqlstore.SQLStore
}

func (r *Repo) GetConfigHistory(
	ctx context.Context, orgId valuer.UUID, typ opamptypes.ElementType, limit int,
) ([]opamptypes.AgentConfigVersion, error) {
	var c []opamptypes.AgentConfigVersion
	err := r.store.BunDB().NewSelect().
		Model(&c).
		ColumnExpr("id, version, element_type, deploy_status, deploy_result, created_at").
		ColumnExpr("COALESCE(created_by, '') as created_by").
		ColumnExpr(`COALESCE((SELECT display_name FROM users WHERE users.id = acv.created_by), 'unknown') as created_by_name`).
		ColumnExpr("COALESCE(hash, '') as hash, COALESCE(config, '{}') as config").
		Where("acv.element_type = ?", typ).
		Where("acv.org_id = ?", orgId).
		OrderExpr("acv.created_at DESC, acv.version DESC").
		Limit(limit).
		Scan(ctx)

	if err != nil {
		return nil, errors.WrapInternalf(err, CodeConfigHistoryGetFailed, "failed to get config history")
	}

	incompleteStatuses := []opamptypes.DeployStatus{opamptypes.DeployInitiated, opamptypes.Deploying}
	for idx := 1; idx < len(c); idx++ {
		if slices.Contains(incompleteStatuses, c[idx].DeployStatus) {
			c[idx].DeployStatus = opamptypes.DeployStatusUnknown
		}
	}

	return c, nil
}

func (r *Repo) GetConfigVersion(
	ctx context.Context, orgId valuer.UUID, typ opamptypes.ElementType, v int,
) (*opamptypes.AgentConfigVersion, error) {
	var c opamptypes.AgentConfigVersion
	err := r.store.BunDB().NewSelect().
		Model(&c).
		ColumnExpr("id, version, element_type, deploy_status, deploy_result, created_at").
		ColumnExpr("COALESCE(created_by, '') as created_by").
		ColumnExpr(`COALESCE((SELECT display_name FROM users WHERE users.id = acv.created_by), 'unknown') as created_by_name`).
		ColumnExpr("COALESCE(hash, '') as hash, COALESCE(config, '{}') as config").
		Where("acv.element_type = ?", typ).
		Where("acv.version = ?", v).
		Where("acv.org_id = ?", orgId).
		Scan(ctx)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.WrapNotFoundf(err, CodeConfigVersionNotFound, "config version not found")
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get config version")
	}

	return &c, nil
}

func (r *Repo) GetLatestVersion(
	ctx context.Context, orgId valuer.UUID, typ opamptypes.ElementType,
) (*opamptypes.AgentConfigVersion, error) {
	var c opamptypes.AgentConfigVersion
	err := r.store.BunDB().NewSelect().
		Model(&c).
		ColumnExpr("id, version, element_type, deploy_status, deploy_result, created_at").
		ColumnExpr("COALESCE(created_by, '') as created_by").
		ColumnExpr(`COALESCE((SELECT display_name FROM users WHERE users.id = acv.created_by), 'unknown') as created_by_name`).
		Where("acv.element_type = ?", typ).
		Where("acv.org_id = ?", orgId).
		Where("version = (SELECT MAX(version) FROM agent_config_version WHERE acv.element_type = ?)", typ).
		Scan(ctx)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.WrapNotFoundf(err, CodeConfigVersionNotFound, "config latest version not found")
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to get latest config version")
	}

	return &c, nil
}

func (r *Repo) insertConfig(
	ctx context.Context, orgId valuer.UUID, userId valuer.UUID, c *opamptypes.AgentConfigVersion, elements []string,
) error {

	if c.ElementType.StringValue() == "" {
		return errors.NewInvalidInputf(CodeElementTypeRequired, "element type is required for creating agent config version")
	}

	// allowing empty elements for logs - use case is deleting all pipelines
	if len(elements) == 0 && c.ElementType != opamptypes.ElementTypeLogPipelines {
		zap.L().Error("insert config called with no elements ", zap.String("ElementType", c.ElementType.StringValue()))
		return errors.NewInvalidInputf(CodeConfigElementsRequired, "config must have atleast one element")
	}

	if c.Version != 0 {
		// the version can not be set by the user, we want to auto-assign the versions
		// in a monotonically increasing order starting with 1. hence, we reject insert
		// requests with version anything other than 0. here, 0 indicates un-assigned
		zap.L().Error("invalid version assignment while inserting agent config", zap.Int("version", c.Version), zap.String("ElementType", c.ElementType.StringValue()))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "user defined versions are not supported in the agent config")
	}

	configVersion, err := r.GetLatestVersion(ctx, orgId, c.ElementType)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		zap.L().Error("failed to fetch latest config version", zap.Error(err))
		return err
	}

	if configVersion != nil {
		c.IncrementVersion(configVersion.Version)
	} else {
		// first version
		c.Version = 1
	}

	defer func() {
		if err != nil {
			// remove all the damage (invalid rows from db)
			r.store.BunDB().NewDelete().Model(new(opamptypes.AgentConfigVersion)).Where("id = ?", c.ID).Where("org_id = ?", orgId).Exec(ctx)
			r.store.BunDB().NewDelete().Model(new(opamptypes.AgentConfigElement)).Where("version_id = ?", c.ID).Exec(ctx)
		}
	}()

	_, dbErr := r.store.
		BunDB().
		NewInsert().
		Model(c).
		Exec(ctx)
	if dbErr != nil {
		zap.L().Error("error in inserting config version: ", zap.Error(dbErr))
		return errors.WrapInternalf(dbErr, CodeConfigVersionInsertFailed, "failed to insert config version")
	}

	for _, e := range elements {
		agentConfigElement := &opamptypes.AgentConfigElement{
			Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			VersionID:   c.ID,
			ElementType: c.ElementType.StringValue(),
			ElementID:   e,
		}
		_, dbErr = r.store.BunDB().NewInsert().Model(agentConfigElement).Exec(ctx)
		if dbErr != nil {
			return errors.WrapInternalf(dbErr, CodeConfigElementInsertFailed, "failed to insert config element")
		}
	}

	return nil
}

func (r *Repo) updateDeployStatus(ctx context.Context,
	orgId valuer.UUID,
	elementType opamptypes.ElementType,
	version int,
	status string,
	result string,
	lastHash string,
	lastconf string) *model.ApiError {

	// check if it has org orgID prefix
	// ensuring it here and also ensuring in coordinator.go
	if !strings.HasPrefix(lastHash, orgId.String()) {
		lastHash = orgId.String() + lastHash
	}

	_, err := r.store.BunDB().NewUpdate().
		Model(new(opamptypes.AgentConfigVersion)).
		Set("deploy_status = ?", status).
		Set("deploy_result = ?", result).
		Set("hash = COALESCE(?, hash)", lastHash).
		Set("config = ?", lastconf).
		Where("version = ?", version).
		Where("element_type = ?", elementType).
		Where("org_id = ?", orgId).
		Exec(ctx)
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return model.BadRequest(fmt.Errorf("failed to update deploy status"))
	}

	return nil
}

func (r *Repo) updateDeployStatusByHash(
	ctx context.Context, orgId valuer.UUID, confighash string, status string, result string,
) error {
	_, err := r.store.BunDB().NewUpdate().
		Model(new(opamptypes.AgentConfigVersion)).
		Set("deploy_status = ?", status).
		Set("deploy_result = ?", result).
		Where("hash = ?", confighash).
		Where("org_id = ?", orgId).
		Exec(ctx)
	if err != nil {
		zap.L().Error("failed to update deploy status", zap.Error(err))
		return errors.WrapInternalf(err, CodeConfigDeployStatusUpdateFailed, "failed to update deploy status")
	}

	return nil
}
