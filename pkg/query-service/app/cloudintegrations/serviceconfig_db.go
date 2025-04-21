package cloudintegrations

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/jmoiron/sqlx"
)

type ServiceConfigDatabase interface {
	get(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
	) (*ServiceConfig, *model.ApiError)

	upsert(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
		config ServiceConfig,
	) (*ServiceConfig, *model.ApiError)

	getAllForAccount(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
	) (
		configsBySvcId map[string]*ServiceConfig,
		apiErr *model.ApiError,
	)
}

func newServiceConfigRepository(db *sqlx.DB) (
	*serviceConfigSQLRepository, error,
) {
	return &serviceConfigSQLRepository{
		db: db,
	}, nil
}

type serviceConfigSQLRepository struct {
	db *sqlx.DB
}

func (r *serviceConfigSQLRepository) get(
	ctx context.Context,
	cloudProvider string,
	cloudAccountId string,
	serviceId string,
) (*ServiceConfig, *model.ApiError) {

	var result ServiceConfig

	err := r.db.GetContext(
		ctx, &result, `
			select
				config_json
			from cloud_integrations_service_configs
			where
				cloud_provider=$1
				and cloud_account_id=$2
				and service_id=$3
		`,
		cloudProvider, cloudAccountId, serviceId,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, model.NotFoundError(
				fmt.Errorf("couldn't find %s %s config for %s", cloudProvider, serviceId, cloudAccountId))
		}

		return nil, model.InternalError(fmt.Errorf("couldn't query cloud service config: %w", err))
	}

	return &result, nil

}

func (r *serviceConfigSQLRepository) upsert(
	ctx context.Context,
	cloudProvider string,
	cloudAccountId string,
	serviceId string,
	config ServiceConfig,
) (*ServiceConfig, *model.ApiError) {

	query := `
		INSERT INTO cloud_integrations_service_configs (
			cloud_provider,
			cloud_account_id,
			service_id,
			config_json
		) values ($1, $2, $3, $4)
		on conflict(cloud_provider, cloud_account_id, service_id)
			do update set config_json=excluded.config_json
	`
	_, dbErr := r.db.ExecContext(
		ctx, query,
		cloudProvider, cloudAccountId, serviceId, &config,
	)
	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not upsert cloud service config: %w", dbErr,
		))
	}

	upsertedConfig, apiErr := r.get(ctx, cloudProvider, cloudAccountId, serviceId)
	if apiErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't fetch upserted service config: %w", apiErr.ToError(),
		))
	}

	return upsertedConfig, nil

}

func (r *serviceConfigSQLRepository) getAllForAccount(
	ctx context.Context,
	cloudProvider string,
	cloudAccountId string,
) (map[string]*ServiceConfig, *model.ApiError) {

	type ScannedServiceConfigRecord struct {
		ServiceId string        `db:"service_id"`
		Config    ServiceConfig `db:"config_json"`
	}

	records := []ScannedServiceConfigRecord{}

	err := r.db.SelectContext(
		ctx, &records, `
			select
				service_id,
				config_json
			from cloud_integrations_service_configs
			where
				cloud_provider=$1
				and cloud_account_id=$2
		`,
		cloudProvider, cloudAccountId,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query service configs from db: %w", err,
		))
	}

	result := map[string]*ServiceConfig{}

	for _, r := range records {
		result[r.ServiceId] = &r.Config
	}

	return result, nil
}
