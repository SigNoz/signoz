package logparsingpipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.signoz.io/signoz/pkg/types/pipelines"
	"go.uber.org/zap"
)

// Repo handles DDL and DML ops on ingestion pipeline
type Repo struct {
	sqlStore sqlstore.SQLStore
}

const logPipelines = "log_pipelines"

// NewRepo initiates a new ingestion repo
func NewRepo(sqlStore sqlstore.SQLStore) Repo {
	return Repo{
		sqlStore: sqlStore,
	}
}

// insertPipeline stores a given postable pipeline to database
func (r *Repo) insertPipeline(
	ctx context.Context, orgID string, postable *pipelines.PostablePipeline,
) (*pipelines.GettablePipeline, *model.ApiError) {
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
	filter, err := json.Marshal(postable.Filter)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err,
			"failed to marshal postable pipeline filter",
		))
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, model.UnauthorizedError(fmt.Errorf("failed to get email from context"))
	}

	insertRow := &pipelines.GettablePipeline{
		StoreablePipeline: pipelines.StoreablePipeline{
			OrgID:        orgID,
			ID:           uuid.New().String(),
			OrderID:      postable.OrderID,
			Enabled:      postable.Enabled,
			Name:         postable.Name,
			Alias:        postable.Alias,
			Description:  postable.Description,
			FilterString: string(filter),
			ConfigJSON:   string(rawConfig),
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: claims.Email,
			},
		},
		Filter: postable.Filter,
		Config: postable.Config,
	}

	_, err = r.sqlStore.BunDB().NewInsert().
		Model(&insertRow.StoreablePipeline).
		Exec(ctx)

	if err != nil {
		zap.L().Error("error in inserting pipeline data", zap.Error(err))
		return nil, model.InternalError(errors.Wrap(err, "failed to insert pipeline"))
	}

	return insertRow, nil
}

// getPipelinesByVersion returns pipelines associated with a given version
func (r *Repo) getPipelinesByVersion(
	ctx context.Context, orgID string, version int,
) ([]pipelines.GettablePipeline, []error) {
	var errors []error
	storablePipelines := []pipelines.StoreablePipeline{}
	err := r.sqlStore.BunDB().NewSelect().
		Table("pipelines").
		Model(&storablePipelines).
		Join("JOIN agent_config_elements e ON pipelines.id = e.element_id").
		Join("JOIN agent_config_versions v ON v.id = e.version_id").
		Where("e.element_type = ?", logPipelines). // TODO: nitya - add org_id to this as well
		Where("v.version = ?", version).           // TODO: nitya - add org_id to this as well
		Where("pipelines.org_id = ?", orgID).
		Order("pipelines.order_id ASC").
		Scan(ctx)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to get drop pipelines from db: %v", err)}
	}

	gettablePipelines := make([]pipelines.GettablePipeline, len(storablePipelines))
	if len(storablePipelines) == 0 {
		return gettablePipelines, nil
	}

	for i := range storablePipelines {
		gettablePipelines[i].StoreablePipeline = storablePipelines[i]
		if err := gettablePipelines[i].ParseRawConfig(); err != nil {
			errors = append(errors, err)
		}
		if err := gettablePipelines[i].ParseFilter(); err != nil {
			errors = append(errors, err)
		}
	}

	return gettablePipelines, errors
}

func (r *Repo) GetDefaultOrgID(ctx context.Context) (string, *model.ApiError) {
	var orgs []types.Organization
	err := r.sqlStore.BunDB().NewSelect().
		Model(&orgs).
		Scan(ctx)
	if err != nil {
		return "", model.InternalError(errors.Wrap(err, "failed to get default org ID"))
	}
	if len(orgs) == 0 {
		return "", model.InternalError(errors.New("no orgs found"))
	}
	return orgs[0].ID, nil
}

// GetPipelines returns pipeline and errors (if any)
func (r *Repo) GetPipeline(
	ctx context.Context, orgID string, id string,
) (*pipelines.GettablePipeline, *model.ApiError) {
	storablePipelines := []pipelines.StoreablePipeline{}

	err := r.sqlStore.BunDB().NewSelect().
		Model(&storablePipelines).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		zap.L().Error("failed to get ingestion pipeline from db", zap.Error(err))
		return nil, model.InternalError(errors.Wrap(err, "failed to get ingestion pipeline from db"))
	}

	if len(storablePipelines) == 0 {
		zap.L().Warn("No row found for ingestion pipeline id", zap.String("id", id))
		return nil, model.NotFoundError(fmt.Errorf("no row found for ingestion pipeline id %v", id))
	}

	if len(storablePipelines) == 1 {
		gettablePipeline := pipelines.GettablePipeline{}
		gettablePipeline.StoreablePipeline = storablePipelines[0]
		if err := gettablePipeline.ParseRawConfig(); err != nil {
			zap.L().Error("invalid pipeline config found", zap.String("id", id), zap.Error(err))
			return nil, model.InternalError(
				errors.Wrap(err, "found an invalid pipeline config"),
			)
		}
		if err := gettablePipeline.ParseFilter(); err != nil {
			zap.L().Error("invalid pipeline filter found", zap.String("id", id), zap.Error(err))
			return nil, model.InternalError(
				errors.Wrap(err, "found an invalid pipeline filter"),
			)
		}
		return &gettablePipeline, nil
	}

	return nil, model.InternalError(fmt.Errorf("multiple pipelines with same id"))
}

func (r *Repo) DeletePipeline(ctx context.Context, orgID string, id string) error {
	_, err := r.sqlStore.BunDB().NewDelete().
		Model(&pipelines.StoreablePipeline{}).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return model.BadRequest(err)
	}
	return nil
}
