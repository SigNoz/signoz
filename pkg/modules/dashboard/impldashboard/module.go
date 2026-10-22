package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store                   dashboardtypes.Store
	settings                factory.ScopedProviderSettings
	analytics               analytics.Analytics
	orgGetter               organization.Getter
	queryParser             queryparser.QueryParser
	tagModule               tag.Module
	systemDashboardRegistry dashboardtypes.SystemDashboardRegistry
}

func NewModule(store dashboardtypes.Store, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser, tagModule tag.Module, systemDashboardRegistry dashboardtypes.SystemDashboardRegistry) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard")
	return &module{
		store:                   store,
		settings:                scopedProviderSettings,
		analytics:               analytics,
		orgGetter:               orgGetter,
		queryParser:             queryParser,
		tagModule:               tagModule,
		systemDashboardRegistry: systemDashboardRegistry,
	}
}
func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	dashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewStatsFromStorableDashboards(dashboards), nil
}

// CreatePublic is not supported.
func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublic(_ context.Context, _, _ valuer.UUID) (*dashboardtypes.PublicDashboard, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetDashboardByPublicIDV2(_ context.Context, _ valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicWidgetQueryRangeV2(context.Context, valuer.UUID, string, string, string) (*qbtypes.QueryRangeResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicDashboardSelectorsAndOrg(_ context.Context, _ valuer.UUID, _ []*types.Organization) ([]coretypes.Selector, valuer.UUID, error) {
	return nil, valuer.UUID{}, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) UpdatePublic(_ context.Context, _ valuer.UUID, _ *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) DeletePublic(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}
