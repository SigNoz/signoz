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
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	pkgDashboardModule dashboard.Module
	store              dashboardtypes.Store
	settings           factory.ScopedProviderSettings
	role               role.Module
	querier            querier.Querier
	licensing          licensing.Licensing
}

func NewModule(store dashboardtypes.Store, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, role role.Module, queryParser queryparser.QueryParser, querier querier.Querier, licensing licensing.Licensing) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/ee/modules/dashboard/impldashboard")
	pkgDashboardModule := pkgimpldashboard.NewModule(store, settings, analytics, orgGetter, queryParser)

	return &module{
		pkgDashboardModule: pkgDashboardModule,
		store:              store,
		settings:           scopedProviderSettings,
		role:               role,
		querier:            querier,
		licensing:          licensing,
	}
}

func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storablePublicDashboard, err := module.store.GetPublic(ctx, publicDashboard.DashboardID.StringValue())
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}
	if storablePublicDashboard != nil {
		return errors.Newf(errors.TypeAlreadyExists, dashboardtypes.ErrCodePublicDashboardAlreadyExists, "dashboard with id %s is already public", storablePublicDashboard.DashboardID)
	}

	role, err := module.role.GetOrCreate(ctx, roletypes.NewRole(roletypes.AnonymousUserRoleName, roletypes.AnonymousUserRoleDescription, roletypes.RoleTypeManaged.StringValue(), orgID))
	if err != nil {
		return err
	}

	err = module.role.Assign(ctx, role.ID, orgID, authtypes.MustNewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.StringValue(), orgID, nil))
	if err != nil {
		return err
	}

	additionObject := authtypes.MustNewObject(
		authtypes.Resource{
			Name: dashboardtypes.TypeableMetaResourcePublicDashboard.Name(),
			Type: authtypes.TypeMetaResource,
		},
		authtypes.MustNewSelector(authtypes.TypeMetaResource, publicDashboard.ID.String()),
	)

	err = module.role.PatchObjects(ctx, orgID, role.ID, authtypes.RelationRead, []*authtypes.Object{additionObject}, nil)
	if err != nil {
		return err
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

func (module *module) GetPublicDashboardSelectorsAndOrg(ctx context.Context, id valuer.UUID, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
	orgIDs := make([]string, len(orgs))
	for idx, org := range orgs {
		orgIDs[idx] = org.ID.StringValue()
	}

	storableDashboard, err := module.store.GetDashboardByOrgsAndPublicID(ctx, orgIDs, id.StringValue())
	if err != nil {
		return nil, valuer.UUID{}, err
	}

	return []authtypes.Selector{
		authtypes.MustNewSelector(authtypes.TypeMetaResource, id.StringValue()),
	}, storableDashboard.OrgID, nil
}

func (module *module) GetPublicWidgetQueryRange(ctx context.Context, id valuer.UUID, widgetIdx, startTime, endTime uint64) (*querybuildertypesv5.QueryRangeResponse, error) {
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

func (module *module) UpdatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return module.store.UpdatePublic(ctx, dashboardtypes.NewStorablePublicDashboardFromPublicDashboard(publicDashboard))
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be delete it")
	}

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		err := module.deletePublic(ctx, orgID, id)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return err
		}

		err = module.store.Delete(ctx, orgID, id)
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (module *module) DeletePublic(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	publicDashboard, err := module.GetPublic(ctx, orgID, dashboardID)
	if err != nil {
		return err
	}

	role, err := module.role.GetOrCreate(ctx, roletypes.NewRole(roletypes.AnonymousUserRoleName, roletypes.AnonymousUserRoleDescription, roletypes.RoleTypeManaged.StringValue(), orgID))
	if err != nil {
		return err
	}

	deletionObject := authtypes.MustNewObject(
		authtypes.Resource{
			Name: dashboardtypes.TypeableMetaResourcePublicDashboard.Name(),
			Type: authtypes.TypeMetaResource,
		},
		authtypes.MustNewSelector(authtypes.TypeMetaResource, publicDashboard.ID.String()),
	)

	err = module.role.PatchObjects(ctx, orgID, role.ID, authtypes.RelationRead, nil, []*authtypes.Object{deletionObject})
	if err != nil {
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

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Create(ctx, orgID, createdBy, creator, data)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Get(ctx, orgID, id)
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error) {
	return module.pkgDashboardModule.GetByMetricNames(ctx, orgID, metricNames)
}

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return module.pkgDashboardModule.MustGetTypeables()
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.List(ctx, orgID)
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error) {
	return module.pkgDashboardModule.Update(ctx, orgID, id, updatedBy, data, diff)
}

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, role types.Role, lock bool) error {
	return module.pkgDashboardModule.LockUnlock(ctx, orgID, id, updatedBy, role, lock)
}

func (module *module) deletePublic(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) error {
	publicDashboard, err := module.store.GetPublic(ctx, dashboardID.String())
	if err != nil {
		return err
	}

	role, err := module.role.GetOrCreate(ctx, roletypes.NewRole(roletypes.AnonymousUserRoleName, roletypes.AnonymousUserRoleDescription, roletypes.RoleTypeManaged.StringValue(), orgID))
	if err != nil {
		return err
	}

	deletionObject := authtypes.MustNewObject(
		authtypes.Resource{
			Name: dashboardtypes.TypeableMetaResourcePublicDashboard.Name(),
			Type: authtypes.TypeMetaResource,
		},
		authtypes.MustNewSelector(authtypes.TypeMetaResource, publicDashboard.ID.String()),
	)

	err = module.role.PatchObjects(ctx, orgID, role.ID, authtypes.RelationRead, nil, []*authtypes.Object{deletionObject})
	if err != nil {
		return err
	}

	err = module.store.DeletePublic(ctx, dashboardID.StringValue())
	if err != nil {
		return err
	}

	return nil
}
