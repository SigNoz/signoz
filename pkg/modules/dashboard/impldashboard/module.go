package impldashboard

import (
	"context"
	"maps"
	"strings"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store     dashboardtypes.Store
	settings  factory.ScopedProviderSettings
	analytics analytics.Analytics
	orgGetter organization.Getter
	role      role.Module
}

func NewModule(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, role role.Module) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/impldashboard")
	return &module{
		store:     NewStore(sqlstore),
		settings:  scopedProviderSettings,
		analytics: analytics,
		orgGetter: orgGetter,
		role:      role,
	}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, postableDashboard dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
	dashboard, err := dashboardtypes.NewDashboard(orgID, createdBy, postableDashboard)
	if err != nil {
		return nil, err
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return nil, err
	}

	err = module.store.Create(ctx, storableDashboard)
	if err != nil {
		return nil, err
	}

	module.analytics.TrackUser(ctx, orgID.String(), creator.String(), "Dashboard Created", dashboardtypes.NewStatsFromStorableDashboards([]*dashboardtypes.StorableDashboard{storableDashboard}))
	return dashboard, nil
}

func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
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

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	storableDashboard, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard), nil
}

func (module *module) GetPublic(ctx context.Context, orgID valuer.UUID, dashboardID valuer.UUID) (*dashboardtypes.PublicDashboard, error) {
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

func (module *module) GetPublicDashboardOrgAndSelectors(ctx context.Context, id valuer.UUID, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
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

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	storableDashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardsFromStorableDashboards(storableDashboards), nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatableDashboard dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error) {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	err = dashboard.Update(ctx, updatableDashboard, updatedBy, diff)
	if err != nil {
		return nil, err
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return nil, err
	}

	err = module.store.Update(ctx, orgID, storableDashboard)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (module *module) UpdatePublic(ctx context.Context, publicDashboard *dashboardtypes.PublicDashboard) error {
	return module.store.UpdatePublic(ctx, dashboardtypes.NewStorablePublicDashboardFromPublicDashboard(publicDashboard))
}

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, role types.Role, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = dashboard.LockUnlock(lock, role, updatedBy)
	if err != nil {
		return err
	}
	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}

	err = module.store.Update(ctx, orgID, storableDashboard)
	if err != nil {
		return err
	}

	return nil
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
		err := module.DeletePublic(ctx, orgID, id)
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

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error) {
	dashboards, err := module.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// Initialize result map for each metric
	result := make(map[string][]map[string]string)

	// Process the JSON data in Go
	for _, dashboard := range dashboards {
		var dashData = dashboard.Data

		dashTitle, _ := dashData["title"].(string)
		widgets, ok := dashData["widgets"].([]interface{})
		if !ok {
			continue
		}

		for _, w := range widgets {
			widget, ok := w.(map[string]interface{})
			if !ok {
				continue
			}

			widgetTitle, _ := widget["title"].(string)
			widgetID, _ := widget["id"].(string)

			query, ok := widget["query"].(map[string]interface{})
			if !ok {
				continue
			}

			builder, ok := query["builder"].(map[string]interface{})
			if !ok {
				continue
			}

			queryData, ok := builder["queryData"].([]interface{})
			if !ok {
				continue
			}

			for _, qd := range queryData {
				data, ok := qd.(map[string]interface{})
				if !ok {
					continue
				}

				if dataSource, ok := data["dataSource"].(string); !ok || dataSource != "metrics" {
					continue
				}

				aggregateAttr, ok := data["aggregateAttribute"].(map[string]interface{})
				if !ok {
					continue
				}

				if key, ok := aggregateAttr["key"].(string); ok {
					// Check if this metric is in our list of interest
					for _, metricName := range metricNames {
						if strings.TrimSpace(key) == metricName {
							result[metricName] = append(result[metricName], map[string]string{
								"dashboard_id":   dashboard.ID,
								"widget_name":    widgetTitle,
								"widget_id":      widgetID,
								"dashboard_name": dashTitle,
							})
						}
					}
				}
			}
		}
	}

	return result, nil
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

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{dashboardtypes.TypeableMetaResourceDashboard, dashboardtypes.TypeableMetaResourcesDashboards}
}
