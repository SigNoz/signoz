package cloudintegrations

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type serviceConfigRepository interface {
	get(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
	) (*CloudServiceConfig, *model.ApiError)

	upsert(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
		config CloudServiceConfig,
	) (*CloudServiceConfig, *model.ApiError)

	getAllForAccount(
		ctx context.Context,
		cloudProvider string,
		cloudAccountId string,
	) (
		configsBySvcId map[string]*CloudServiceConfig,
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
) (*CloudServiceConfig, *model.ApiError) {

	var result CloudServiceConfig

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

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find %s %s config for %s",
			cloudProvider, serviceId, cloudAccountId,
		))

	} else if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query cloud service config: %w", err,
		))
	}

	return &result, nil

}

func (r *serviceConfigSQLRepository) upsert(
	ctx context.Context,
	cloudProvider string,
	cloudAccountId string,
	serviceId string,
	config CloudServiceConfig,
) (*CloudServiceConfig, *model.ApiError) {

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
) (map[string]*CloudServiceConfig, *model.ApiError) {

	type ScannedServiceConfigRecord struct {
		ServiceId string             `db:"service_id"`
		Config    CloudServiceConfig `db:"config_json"`
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

	result := map[string]*CloudServiceConfig{}

	for _, r := range records {
		result[r.ServiceId] = &r.Config
	}

	return result, nil
}
