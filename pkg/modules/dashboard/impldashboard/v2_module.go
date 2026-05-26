package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) CreateV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, postable dashboardtypes.PostableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if !source.IsValid() {
		return nil, errors.Newf(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidSource, "invalid dashboard source %q, must be one of user, system, integration", source.StringValue())
	}
	if err := postable.Validate(); err != nil {
		return nil, err
	}

	dashboard := postable.NewDashboardV2(orgID, createdBy, source)
	var storableDashboard *dashboardtypes.StorableDashboard

	err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		resolvedTags, err := m.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, dashboard.ID, postable.Tags)
		if err != nil {
			return err
		}
		dashboard.Tags = resolvedTags

		storable, err := dashboard.ToStorableDashboard()
		if err != nil {
			return err
		}
		storableDashboard = storable
		return m.store.Create(ctx, storable)
	})
	if err != nil {
		return nil, err
	}

	m.analytics.TrackUser(ctx, orgID.String(), creator.String(), "Dashboard Created", dashboardtypes.NewStatsFromStorableDashboards([]*dashboardtypes.StorableDashboard{storableDashboard}))
	return dashboard, nil
}

func (module *module) GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	storable, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	tags, err := module.tagModule.ListForResource(ctx, orgID, coretypes.KindDashboard, id)
	if err != nil {
		return nil, err
	}

	return storable.ToDashboardV2(tags)
}
