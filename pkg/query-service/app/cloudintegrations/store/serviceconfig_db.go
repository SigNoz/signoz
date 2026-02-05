package store

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	CodeServiceConfigNotFound = errors.MustNewCode("service_config_not_found")
)

type ServiceConfigDatabase interface {
	Get(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
		serviceType string,
	) ([]byte, error)

	Upsert(
		ctx context.Context,
		orgID string,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
		config []byte,
	) ([]byte, error)

	GetAllForAccount(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
	) (
		map[string][]byte,
		error,
	)
}

func NewServiceConfigRepository(store sqlstore.SQLStore) ServiceConfigDatabase {
	return &serviceConfigSQLRepository{store: store}
}

type serviceConfigSQLRepository struct {
	store sqlstore.SQLStore
}

func (r *serviceConfigSQLRepository) Get(
	ctx context.Context,
	orgID string,
	cloudAccountId string,
	serviceType string,
) ([]byte, error) {
	var result integrationstypes.CloudIntegrationService

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Join("JOIN cloud_integration ci ON ci.id = cis.cloud_integration_id").
		Where("ci.org_id = ?", orgID).
		Where("ci.id = ?", cloudAccountId).
		Where("cis.type = ?", serviceType).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.WrapNotFoundf(err, CodeServiceConfigNotFound, "couldn't find config for cloud account %s", cloudAccountId)
		}

		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query cloud service config")
	}

	return result.Config, nil
}

func (r *serviceConfigSQLRepository) Upsert(
	ctx context.Context,
	orgID string,
	cloudProvider string,
	cloudAccountId string,
	serviceId string,
	config []byte,
) ([]byte, error) {
	// get cloud integration id from account id
	// if the account is not connected, we don't need to upsert the config
	var cloudIntegrationId string
	err := r.store.BunDB().NewSelect().
		Model((*integrationstypes.CloudIntegration)(nil)).
		Column("id").
		Where("provider = ?", cloudProvider).
		Where("account_id = ?", cloudAccountId).
		Where("org_id = ?", orgID).
		Where("removed_at is NULL").
		Where("last_agent_report is not NULL").
		Scan(ctx, &cloudIntegrationId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.WrapNotFoundf(
				err,
				CodeCloudIntegrationAccountNotFound,
				"couldn't find active cloud integration account",
			)
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query cloud integration id")
	}

	serviceConfig := integrationstypes.CloudIntegrationService{
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
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't upsert cloud service config")
	}

	return config, nil
}

func (r *serviceConfigSQLRepository) GetAllForAccount(
	ctx context.Context,
	orgID string,
	cloudAccountId string,
) (map[string][]byte, error) {
	var serviceConfigs []integrationstypes.CloudIntegrationService

	err := r.store.BunDB().NewSelect().
		Model(&serviceConfigs).
		Join("JOIN cloud_integration ci ON ci.id = cis.cloud_integration_id").
		Where("ci.id = ?", cloudAccountId).
		Where("ci.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query service configs from db")
	}

	result := make(map[string][]byte)

	for _, r := range serviceConfigs {
		result[r.Type] = r.Config
	}

	return result, nil
}
