package integrations

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
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
) ([]cloudintegrationtypes.InstalledIntegration, *model.ApiError) {
	integrations := []cloudintegrationtypes.InstalledIntegration{}

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
) (map[string]cloudintegrationtypes.InstalledIntegration, *model.ApiError) {
	integrations := []cloudintegrationtypes.InstalledIntegration{}

	typeValues := []interface{}{}
	for _, integrationType := range integrationTypes {
		typeValues = append(typeValues, integrationType)
	}

	err := r.store.BunDBCtx(ctx).NewSelect().Model(&integrations).
		Where("org_id = ?", orgId).
		Where("type IN (?)", bun.In(typeValues)).
		Scan(ctx)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}

	result := map[string]cloudintegrationtypes.InstalledIntegration{}
	for _, ii := range integrations {
		result[ii.Type] = ii
	}

	return result, nil
}

func (r *InstalledIntegrationsSqliteRepo) upsert(
	ctx context.Context,
	orgId string,
	integrationType string,
	config cloudintegrationtypes.InstalledIntegrationConfig,
) (*cloudintegrationtypes.InstalledIntegration, *model.ApiError) {

	integration := cloudintegrationtypes.InstalledIntegration{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		OrgID:  orgId,
		Type:   integrationType,
		Config: config,
	}

	_, dbErr := r.store.BunDBCtx(ctx).NewInsert().
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
	_, dbErr := r.store.BunDBCtx(ctx).NewDelete().
		Model(&cloudintegrationtypes.InstalledIntegration{}).
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

func (r *InstalledIntegrationsSqliteRepo) runInTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return r.store.RunInTxCtx(ctx, nil, fn)
}

func (r *InstalledIntegrationsSqliteRepo) createIntegrationDashboard(
	ctx context.Context, row *cloudintegrationtypes.StorableIntegrationDashboard,
) error {
	_, err := r.store.BunDBCtx(ctx).NewInsert().Model(row).Exec(ctx)
	return err
}

func (r *InstalledIntegrationsSqliteRepo) getIntegrationDashboardBySlug(
	ctx context.Context, orgID string, slug string,
) (*cloudintegrationtypes.StorableIntegrationDashboard, error) {
	row := new(cloudintegrationtypes.StorableIntegrationDashboard)
	err := r.store.BunDBCtx(ctx).
		NewSelect().
		Model(row).
		Join("JOIN dashboard AS d ON storable_integration_dashboard.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("storable_integration_dashboard.provider = ?", cloudintegrationtypes.IntegrationDashboardInstalledIntegrationProvider).
		Where("storable_integration_dashboard.slug = ?", slug).
		Scan(ctx)
	if err != nil {
		return nil, r.store.WrapNotFoundErrf(err, errors.CodeNotFound, "integration dashboard with slug %s not found", slug)
	}
	return row, nil
}

func (r *InstalledIntegrationsSqliteRepo) listIntegrationDashboardsBySlugPrefix(
	ctx context.Context, orgID string, slugPrefix string,
) ([]*cloudintegrationtypes.StorableIntegrationDashboard, error) {
	var rows []*cloudintegrationtypes.StorableIntegrationDashboard
	err := r.store.BunDBCtx(ctx).
		NewSelect().
		Model(&rows).
		Join("JOIN dashboard AS d ON storable_integration_dashboard.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("storable_integration_dashboard.provider = ?", cloudintegrationtypes.IntegrationDashboardInstalledIntegrationProvider).
		Where("storable_integration_dashboard.slug LIKE ?", slugPrefix+"%").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *InstalledIntegrationsSqliteRepo) deleteIntegrationDashboardBySlug(
	ctx context.Context, orgID string, slug string,
) error {
	cte := r.store.BunDBCtx(ctx).
		NewSelect().
		TableExpr("integration_dashboard AS id_inner").
		ColumnExpr("id_inner.id").
		Join("JOIN dashboard AS d ON id_inner.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("id_inner.provider = ?", cloudintegrationtypes.IntegrationDashboardInstalledIntegrationProvider).
		Where("id_inner.slug = ?", slug)

	_, err := r.store.BunDBCtx(ctx).
		NewDelete().
		Model(new(cloudintegrationtypes.StorableIntegrationDashboard)).
		With("target", cte).
		Where("id IN (SELECT id FROM target)").
		Exec(ctx)
	return err
}
