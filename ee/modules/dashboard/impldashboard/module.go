package impldashboard

import (
	"context"
	"maps"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	pkgimpldashboard "github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	pkgDashboardModule dashboard.Module
	store              dashboardtypes.Store
	settings           factory.ScopedProviderSettings
	querier            querier.Querier
	licensing          licensing.Licensing
	tagModule          tag.Module
}

func NewModule(store dashboardtypes.Store, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser, querier querier.Querier, licensing licensing.Licensing, tagModule tag.Module) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/ee/modules/dashboard/impldashboard")
	pkgDashboardModule := pkgimpldashboard.NewModule(store, settings, analytics, orgGetter, queryParser, tagModule)

	return &module{
		pkgDashboardModule: pkgDashboardModule,
		store:              store,
		settings:           scopedProviderSettings,
		querier:            querier,
		licensing:          licensing,
		tagModule:          tagModule,
	}
}

func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	dashboard, err := module.Get(ctx, orgID, publicDashboard.DashboardID)
	if err != nil {
		return err
	}
	if err := dashboard.ErrIfNotPublishable(); err != nil {
		return err
	}

	storablePublicDashboard, err := module.store.GetPublic(ctx, publicDashboard.DashboardID.StringValue())
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}
	if storablePublicDashboard != nil {
		return errors.Newf(errors.TypeAlreadyExists, dashboardtypes.ErrCodePublicDashboardAlreadyExists, "dashboard with id %s is already public", storablePublicDashboard.DashboardID)
	}

	err = module.store.CreatePublic(ctx, dashboardtypes.NewStorablePublicDashboardFromPublicDashboard(publicDashboard))
	if err != nil {
		return err
	}

	return nil
}

func (module *module) GetPublic(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) (*dashboardtypes.PublicDashboard, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storablePublicDashboard, err := module.store.GetPublic(ctx, dashboardID.StringValue())
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewPublicDashboardFromStorablePublicDashboard(storablePublicDashboard), nil
}

func (module *module) GetDashboardByPublicID(ctx context.Context, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	storableDashboard, err := module.store.GetDashboardByPublicID(ctx, id.StringValue())
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard), nil
}

func (module *module) GetPublicDashboardSelectorsAndOrg(ctx context.Context, id valuer.UUID, orgs []*types.Organization) ([]coretypes.Selector, valuer.UUID, error) {
	orgIDs := make([]string, len(orgs))
	for idx, org := range orgs {
		orgIDs[idx] = org.ID.StringValue()
	}

	storableDashboard, err := module.store.GetDashboardByOrgsAndPublicID(ctx, orgIDs, id.StringValue())
	if err != nil {
		return nil, valuer.UUID{}, err
	}

	return []coretypes.Selector{
		coretypes.TypeMetaResource.MustSelector(id.StringValue()),
		coretypes.TypeMetaResource.MustSelector(coretypes.WildCardSelectorString),
	}, storableDashboard.OrgID, nil
}

func (module *module) GetPublicWidgetQueryRange(ctx context.Context, id valuer.UUID, widgetIdx, startTime, endTime uint64) (*querybuildertypesv5.QueryRangeResponse, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "dashboard",
		instrumentationtypes.CodeFunctionName: "GetPublicWidgetQueryRange",
	})
	dashboard, err := module.GetDashboardByPublicID(ctx, id)
	if err != nil {
		return nil, err
	}

	query, err := dashboard.GetWidgetQuery(startTime, endTime, widgetIdx, module.settings.Logger())
	if err != nil {
		return nil, err
	}

	return module.querier.QueryRange(ctx, dashboard.OrgID, query)
}

func (module *module) GetDashboardByPublicIDV2(ctx context.Context, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	storableDashboard, err := module.store.GetDashboardByPublicID(ctx, id.StringValue())
	if err != nil {
		return nil, err
	}

	tags, err := module.tagModule.ListForResource(ctx, storableDashboard.OrgID, coretypes.KindDashboard, storableDashboard.ID)
	if err != nil {
		return nil, err
	}

	return storableDashboard.ToDashboardV2(tags)
}

func (module *module) GetPublicWidgetQueryRangeV2(ctx context.Context, id valuer.UUID, panelKey, startTimeRaw, endTimeRaw string) (*querybuildertypesv5.QueryRangeResponse, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "dashboard",
		instrumentationtypes.CodeFunctionName: "GetPublicWidgetQueryRangeV2",
	})

	storableDashboard, err := module.store.GetDashboardByPublicID(ctx, id.StringValue())
	if err != nil {
		return nil, err
	}

	// tags are not needed for query range.
	dashboard, err := storableDashboard.ToDashboardV2(nil)
	if err != nil {
		return nil, err
	}

	publicDashboard, err := module.GetPublic(ctx, dashboard.OrgID, dashboard.ID)
	if err != nil {
		return nil, err
	}

	startTime, endTime, err := publicDashboard.ResolveTimeRange(startTimeRaw, endTimeRaw)
	if err != nil {
		return nil, err
	}

	query, err := dashboard.GetPanelQuery(startTime, endTime, panelKey)
	if err != nil {
		return nil, err
	}

	return module.querier.QueryRange(ctx, dashboard.OrgID, query)
}

func (module *module) UpdatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	dashboard, err := module.Get(ctx, orgID, publicDashboard.DashboardID)
	if err != nil {
		return err
	}
	if err := dashboard.ErrIfNotPublishable(); err != nil {
		return err
	}

	return module.store.UpdatePublic(ctx, dashboardtypes.NewStorablePublicDashboardFromPublicDashboard(publicDashboard))
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if err := dashboard.ErrIfNotDeletable(); err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be delete it")
	}

	return module.delete(ctx, orgID, id)
}

func (module *module) DeleteUnsafe(ctx context.Context, orgID, id valuer.UUID) error {
	return module.delete(ctx, orgID, id)
}

func (module *module) DeletePublic(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	dashboard, err := module.Get(ctx, orgID, dashboardID)
	if err != nil {
		return err
	}
	if err := dashboard.ErrIfNotPublishable(); err != nil {
		return err
	}

	err = module.store.DeletePublic(ctx, dashboardID.StringValue())
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	dashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	publicDashboards, err := module.store.ListPublic(ctx, orgID)
	if err != nil {
		return nil, err
	}

	stats := make(map[string]any)
	maps.Copy(stats, dashboardtypes.NewStatsFromStorableDashboards(dashboards))
	maps.Copy(stats, dashboardtypes.NewStatsFromStorablePublicDashboards(publicDashboards))
	return stats, nil
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Create(ctx, orgID, createdBy, creator, source, data)
}

func (module *module) CreateV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, postable dashboardtypes.PostableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	return module.pkgDashboardModule.CreateV2(ctx, orgID, createdBy, creator, source, postable)
}

func (module *module) CloneV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	return module.pkgDashboardModule.CloneV2(ctx, orgID, createdBy, creator, id)
}

func (module *module) GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	return module.pkgDashboardModule.GetV2(ctx, orgID, id)
}

func (module *module) UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatable dashboardtypes.UpdatableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	return module.pkgDashboardModule.UpdateV2(ctx, orgID, id, updatedBy, updatable)
}

func (module *module) PatchV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, patch dashboardtypes.PatchableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	return module.pkgDashboardModule.PatchV2(ctx, orgID, id, updatedBy, patch)
}

func (module *module) DeleteV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.DeletePublic(ctx, id.String()); err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return err
		}
		return module.pkgDashboardModule.DeleteV2(ctx, orgID, id)
	})
}

func (module *module) LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error {
	return module.pkgDashboardModule.LockUnlockV2(ctx, orgID, id, updatedBy, isAdmin, lock)
}

func (module *module) ListV2(ctx context.Context, orgID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardV2, error) {
	return module.pkgDashboardModule.ListV2(ctx, orgID, params)
}

func (module *module) ListForUserV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardForUserV2, error) {
	return module.pkgDashboardModule.ListForUserV2(ctx, orgID, userID, params)
}

func (module *module) PinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error {
	return module.pkgDashboardModule.PinV2(ctx, orgID, userID, id)
}

func (module *module) UnpinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error {
	return module.pkgDashboardModule.UnpinV2(ctx, orgID, userID, id)
}

func (module *module) DeletePreferencesForUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error {
	return module.pkgDashboardModule.DeletePreferencesForUser(ctx, orgID, userID)
}

func (module *module) CreateView(ctx context.Context, orgID valuer.UUID, postable dashboardtypes.PostableDashboardView) (*dashboardtypes.DashboardView, error) {
	return module.pkgDashboardModule.CreateView(ctx, orgID, postable)
}

func (module *module) ListViews(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.ListableDashboardView, error) {
	return module.pkgDashboardModule.ListViews(ctx, orgID)
}

func (module *module) UpdateView(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updateable dashboardtypes.UpdatableDashboardView) (*dashboardtypes.DashboardView, error) {
	return module.pkgDashboardModule.UpdateView(ctx, orgID, id, updateable)
}

func (module *module) DeleteView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.pkgDashboardModule.DeleteView(ctx, orgID, id)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Get(ctx, orgID, id)
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]dashboardtypes.DashboardPanelRef, error) {
	return module.pkgDashboardModule.GetByMetricNames(ctx, orgID, metricNames)
}

func (module *module) GetByMetricNamesV2(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]dashboardtypes.DashboardPanelRef, error) {
	return module.pkgDashboardModule.GetByMetricNamesV2(ctx, orgID, metricNames)
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.List(ctx, orgID)
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Update(ctx, orgID, id, updatedBy, data, diff)
}

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error {
	return module.pkgDashboardModule.LockUnlock(ctx, orgID, id, updatedBy, isAdmin, lock)
}

func (module *module) delete(ctx context.Context, orgID, id valuer.UUID) error {
	return module.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := module.store.DeletePublic(ctx, id.String()); err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return err
		}
		return module.store.Delete(ctx, orgID, id)
	})
}
