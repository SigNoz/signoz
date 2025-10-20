package cloudintegrations

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ServiceConfigDatabase interface {
	get(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
		serviceType string,
	) (*types.CloudServiceConfig, *model.ApiError)

	upsert(
		ctx context.Context,
		orgID string,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
		config types.CloudServiceConfig,
	) (*types.CloudServiceConfig, *model.ApiError)

	getAllForAccount(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
	) (
		configsBySvcId map[string]*types.CloudServiceConfig,
		apiErr *model.ApiError,
	)
}

func newServiceConfigRepository(store sqlstore.SQLStore) (
	*serviceConfigSQLRepository, error,
) {
	return &serviceConfigSQLRepository{
		store: store,
	}, nil
}

type serviceConfigSQLRepository struct {
	store sqlstore.SQLStore
}

func (r *serviceConfigSQLRepository) get(
	ctx context.Context,
	orgID string,
	cloudAccountId string,
	serviceType string,
) (*types.CloudServiceConfig, *model.ApiError) {

	var result types.CloudIntegrationService

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Join("JOIN cloud_integration ci ON ci.id = cis.cloud_integration_id").
		Where("ci.org_id = ?", orgID).
		Where("ci.id = ?", cloudAccountId).
		Where("cis.type = ?", serviceType).
		Scan(ctx)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(errors.NewNotFoundf(
			errors.CodeNotFound, "couldn't find config for cloud account %s", cloudAccountId,
		))
	} else if err != nil {
		return nil, model.InternalError(errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't query cloud service config",
		))
	}

	return &result.Config, nil

}

func (r *serviceConfigSQLRepository) upsert(
	ctx context.Context,
	orgID string,
	cloudProvider string,
	cloudAccountId string,
	serviceId string,
	config types.CloudServiceConfig,
) (*types.CloudServiceConfig, *model.ApiError) {

	// get cloud integration id from account id
	// if the account is not connected, we don't need to upsert the config
	var cloudIntegrationId string
	err := r.store.BunDB().NewSelect().
		Model((*types.CloudIntegration)(nil)).
		Column("id").
		Where("provider = ?", cloudProvider).
		Where("account_id = ?", cloudAccountId).
		Where("org_id = ?", orgID).
		Where("removed_at is NULL").
		Where("last_agent_report is not NULL").
		Scan(ctx, &cloudIntegrationId)

	if err != nil {
		return nil, model.InternalError(errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't query cloud integration id",
		))
	}

	serviceConfig := types.CloudIntegrationService{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Config:             config,
		Type:               serviceId,
		CloudIntegrationID: cloudIntegrationId,
	}
	_, err = r.store.BunDB().NewInsert().
		Model(&serviceConfig).
		On("conflict(cloud_integration_id, type) do update set config=excluded.config, updated_at=excluded.updated_at").
		Exec(ctx)
	if err != nil {
		return nil, model.InternalError(errors.WrapInternalf(
			err, errors.CodeInternal, "could not upsert cloud service config",
		))
	}

	return &serviceConfig.Config, nil

}

func (r *serviceConfigSQLRepository) getAllForAccount(
	ctx context.Context,
	orgID string,
	cloudAccountId string,
) (map[string]*types.CloudServiceConfig, *model.ApiError) {
	serviceConfigs := []types.CloudIntegrationService{}

	err := r.store.BunDB().NewSelect().
		Model(&serviceConfigs).
		Join("JOIN cloud_integration ci ON ci.id = cis.cloud_integration_id").
		Where("ci.id = ?", cloudAccountId).
		Where("ci.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, model.InternalError(errors.WrapInternalf(
			err, errors.CodeInternal, "could not query service configs from db",
		))
	}

	result := map[string]*types.CloudServiceConfig{}

	for _, r := range serviceConfigs {
		result[r.Type] = &r.Config
	}

	return result, nil
}
