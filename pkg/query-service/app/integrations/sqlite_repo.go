package integrations

import (
	"context"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type InstalledIntegrationsSqliteRepo struct {
	db *sqlx.DB
}

func NewInstalledIntegrationsSqliteRepo(db *sqlx.DB) (
	*InstalledIntegrationsSqliteRepo, error,
) {
	return &InstalledIntegrationsSqliteRepo{
		db: db,
	}, nil
}

func (r *InstalledIntegrationsSqliteRepo) list(
	ctx context.Context,
) ([]InstalledIntegration, *model.ApiError) {
	integrations := []InstalledIntegration{}

	err := r.db.SelectContext(
		ctx, &integrations, `
			select
				integration_id,
				config_json,
				installed_at
			from integrations_installed
			order by installed_at
		`,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}
	return integrations, nil
}

func (r *InstalledIntegrationsSqliteRepo) get(
	ctx context.Context, integrationIds []string,
) (map[string]InstalledIntegration, *model.ApiError) {
	integrations := []InstalledIntegration{}

	idPlaceholders := []string{}
	idValues := []interface{}{}
	for _, id := range integrationIds {
		idPlaceholders = append(idPlaceholders, "?")
		idValues = append(idValues, id)
	}

	err := r.db.SelectContext(
		ctx, &integrations, fmt.Sprintf(`
			select
				integration_id,
				config_json,
				installed_at
			from integrations_installed
			where integration_id in (%s)`,
			strings.Join(idPlaceholders, ", "),
		),
		idValues...,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}

	result := map[string]InstalledIntegration{}
	for _, ii := range integrations {
		result[ii.IntegrationId] = ii
	}

	return result, nil
}

func (r *InstalledIntegrationsSqliteRepo) upsert(
	ctx context.Context,
	integrationId string,
	config InstalledIntegrationConfig,
) (*InstalledIntegration, *model.ApiError) {
	serializedConfig, err := config.Value()
	if err != nil {
		return nil, model.BadRequest(fmt.Errorf(
			"could not serialize integration config: %w", err,
		))
	}

	_, dbErr := r.db.ExecContext(
		ctx, `
			INSERT INTO integrations_installed (
				integration_id,
				config_json
			) values ($1, $2)
			on conflict(integration_id) do update
				set config_json=excluded.config_json
		`, integrationId, serializedConfig,
	)
	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not insert record for integration installation: %w", dbErr,
		))
	}

	res, apiErr := r.get(ctx, []string{integrationId})
	if apiErr != nil || len(res) < 1 {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integration",
		)
	}

	installed := res[integrationId]

	return &installed, nil
}

func (r *InstalledIntegrationsSqliteRepo) delete(
	ctx context.Context, integrationId string,
) *model.ApiError {
	_, dbErr := r.db.ExecContext(ctx, `
		DELETE FROM integrations_installed where integration_id = ?
	`, integrationId)

	if dbErr != nil {
		return model.InternalError(fmt.Errorf(
			"could not delete installed integration record for %s: %w",
			integrationId, dbErr,
		))
	}

	return nil
}
