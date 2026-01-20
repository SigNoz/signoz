package integrations

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type InstalledIntegrationsSqliteRepo struct {
	store sqlstore.SQLStore
}

func NewInstalledIntegrationsSqliteRepo(store sqlstore.SQLStore) (
	*InstalledIntegrationsSqliteRepo, error,
) {
	return &InstalledIntegrationsSqliteRepo{
		store: store,
	}, nil
}

func (r *InstalledIntegrationsSqliteRepo) list(
	ctx context.Context,
	orgId string,
) ([]types.InstalledIntegration, *model.ApiError) {
	integrations := []types.InstalledIntegration{}

	err := r.store.BunDB().NewSelect().
		Model(&integrations).
		Where("org_id = ?", orgId).
		Order("installed_at").
		Scan(ctx)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}
	return integrations, nil
}

func (r *InstalledIntegrationsSqliteRepo) get(
	ctx context.Context, orgId string, integrationTypes []string,
) (map[string]types.InstalledIntegration, *model.ApiError) {
	integrations := []types.InstalledIntegration{}

	typeValues := []interface{}{}
	for _, integrationType := range integrationTypes {
		typeValues = append(typeValues, integrationType)
	}

	err := r.store.BunDB().NewSelect().Model(&integrations).
		Where("org_id = ?", orgId).
		Where("type IN (?)", bun.In(typeValues)).
		Scan(ctx)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}

	result := map[string]types.InstalledIntegration{}
	for _, ii := range integrations {
		result[ii.Type] = ii
	}

	return result, nil
}

func (r *InstalledIntegrationsSqliteRepo) upsert(
	ctx context.Context,
	orgId string,
	integrationType string,
	config types.InstalledIntegrationConfig,
) (*types.InstalledIntegration, *model.ApiError) {

	integration := types.InstalledIntegration{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		OrgID:  orgId,
		Type:   integrationType,
		Config: config,
	}

	_, dbErr := r.store.BunDB().NewInsert().
		Model(&integration).
		On("conflict (type, org_id) DO UPDATE").
		Set("config = EXCLUDED.config").
		Exec(ctx)

	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not insert record for integration installation: %w", dbErr,
		))
	}

	res, apiErr := r.get(ctx, orgId, []string{integrationType})
	if apiErr != nil || len(res) < 1 {
		return nil, model.WrapApiError(
			apiErr, "could not fetch installed integration",
		)
	}

	installed := res[integrationType]

	return &installed, nil
}

func (r *InstalledIntegrationsSqliteRepo) delete(
	ctx context.Context, orgId string, integrationType string,
) *model.ApiError {
	_, dbErr := r.store.BunDB().NewDelete().
		Model(&types.InstalledIntegration{}).
		Where("type = ?", integrationType).
		Where("org_id = ?", orgId).
		Exec(ctx)

	if dbErr != nil {
		return model.InternalError(fmt.Errorf(
			"could not delete installed integration record for %s: %w",
			integrationType, dbErr,
		))
	}

	return nil
}
