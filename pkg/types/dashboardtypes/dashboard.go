package dashboardtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	TypeableResourceDashboard   = authtypes.MustNewTypeableMetaResource(authtypes.MustNewName("dashboard"))
	TypeableResourcesDashboards = authtypes.MustNewTypeableMetaResources(authtypes.MustNewName("dashboards"))
)

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboard"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Data   StorableDashboardData `bun:"data,type:text,notnull"`
	Locked bool                  `bun:"locked,notnull,default:false"`
	OrgID  valuer.UUID           `bun:"org_id,notnull"`
}

type Dashboard struct {
	types.TimeAuditable
	types.UserAuditable

	ID     string                `json:"id"`
	Data   StorableDashboardData `json:"data"`
	Locked bool                  `json:"locked"`
	OrgID  valuer.UUID           `json:"org_id"`
}

type LockUnlockDashboard struct {
	Locked *bool `json:"locked"`
}

type (
	StorableDashboardData map[string]interface{}

	GettableDashboard = Dashboard

	UpdatableDashboard = StorableDashboardData

	PostableDashboard = StorableDashboardData

	ListableDashboard []*GettableDashboard
)

func NewStorableDashboardFromDashboard(dashboard *Dashboard) (*StorableDashboard, error) {
	dashboardID, err := valuer.NewUUID(dashboard.ID)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid")
	}

	return &StorableDashboard{
		Identifiable: types.Identifiable{
			ID: dashboardID,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: dashboard.CreatedAt,
			UpdatedAt: dashboard.UpdatedAt,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: dashboard.CreatedBy,
			UpdatedBy: dashboard.UpdatedBy,
		},
		OrgID:  dashboard.OrgID,
		Data:   dashboard.Data,
		Locked: dashboard.Locked,
	}, nil
}

func NewDashboard(orgID valuer.UUID, createdBy string, storableDashboardData StorableDashboardData) (*Dashboard, error) {
	currentTime := time.Now()

	return &Dashboard{
		ID: valuer.GenerateUUID().StringValue(),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: currentTime,
			UpdatedAt: currentTime,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createdBy,
			UpdatedBy: createdBy,
		},
		OrgID:  orgID,
		Data:   storableDashboardData,
		Locked: false,
	}, nil
}

func NewDashboardFromStorableDashboard(storableDashboard *StorableDashboard) (*Dashboard, error) {
	return &Dashboard{
		ID: storableDashboard.ID.StringValue(),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: storableDashboard.CreatedAt,
			UpdatedAt: storableDashboard.UpdatedAt,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: storableDashboard.CreatedBy,
			UpdatedBy: storableDashboard.UpdatedBy,
		},
		OrgID:  storableDashboard.OrgID,
		Data:   storableDashboard.Data,
		Locked: storableDashboard.Locked,
	}, nil
}

func NewDashboardsFromStorableDashboards(storableDashboards []*StorableDashboard) ([]*Dashboard, error) {
	dashboards := make([]*Dashboard, len(storableDashboards))
	for idx, storableDashboard := range storableDashboards {
		dashboard, err := NewDashboardFromStorableDashboard(storableDashboard)
		if err != nil {
			return nil, err
		}
		dashboards[idx] = dashboard
	}

	return dashboards, nil
}

func NewGettableDashboardsFromDashboards(dashboards []*Dashboard) ([]*GettableDashboard, error) {
	gettableDashboards := make([]*GettableDashboard, len(dashboards))
	for idx, dashboard := range dashboards {
		gettableDashboard, err := NewGettableDashboardFromDashboard(dashboard)
		if err != nil {
			return nil, err
		}
		gettableDashboards[idx] = gettableDashboard
	}
	return gettableDashboards, nil
}

func NewGettableDashboardFromDashboard(dashboard *Dashboard) (*GettableDashboard, error) {
	return &GettableDashboard{
		ID:            dashboard.ID,
		TimeAuditable: dashboard.TimeAuditable,
		UserAuditable: dashboard.UserAuditable,
		OrgID:         dashboard.OrgID,
		Data:          dashboard.Data,
		Locked:        dashboard.Locked,
	}, nil
}

func NewStatsFromStorableDashboards(dashboards []*StorableDashboard) map[string]any {
	stats := make(map[string]any)
	stats["dashboard.panels.count"] = int64(0)
	stats["dashboard.panels.traces.count"] = int64(0)
	stats["dashboard.panels.metrics.count"] = int64(0)
	stats["dashboard.panels.logs.count"] = int64(0)
	for _, dashboard := range dashboards {
		addStatsFromStorableDashboard(dashboard, stats)
	}

	stats["dashboard.count"] = int64(len(dashboards))
	return stats
}

func addStatsFromStorableDashboard(dashboard *StorableDashboard, stats map[string]any) {
	if dashboard.Data == nil {
		return
	}

	if dashboard.Data["widgets"] == nil {
		return
	}

	widgets, ok := dashboard.Data["widgets"]
	if !ok {
		return
	}

	data, ok := widgets.([]interface{})
	if !ok {
		return
	}

	for _, widget := range data {
		sData, ok := widget.(map[string]interface{})
		if ok && sData["query"] != nil {
			stats["dashboard.panels.count"] = stats["dashboard.panels.count"].(int64) + 1
			query, ok := sData["query"].(map[string]interface{})
			if ok && query["queryType"] == "builder" && query["builder"] != nil {
				builderData, ok := query["builder"].(map[string]interface{})
				if ok && builderData["queryData"] != nil {
					builderQueryData, ok := builderData["queryData"].([]interface{})
					if ok {
						for _, queryData := range builderQueryData {
							data, ok := queryData.(map[string]interface{})
							if ok {
								if data["dataSource"] == "traces" {
									stats["dashboard.panels.traces.count"] = stats["dashboard.panels.traces.count"].(int64) + 1
								} else if data["dataSource"] == "metrics" {
									stats["dashboard.panels.metrics.count"] = stats["dashboard.panels.metrics.count"].(int64) + 1
								} else if data["dataSource"] == "logs" {
									stats["dashboard.panels.logs.count"] = stats["dashboard.panels.logs.count"].(int64) + 1
								}
							}
						}
					}
				}
			}
		}
	}
}

func (storableDashboardData *StorableDashboardData) GetWidgetIds() []string {
	data := *storableDashboardData
	widgetIds := []string{}
	if data != nil && data["widgets"] != nil {
		widgets, ok := data["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil && sData["id"] != nil {
						id, ok := sData["id"].(string)

						if ok {
							widgetIds = append(widgetIds, id)
						}

					}
				}
			}
		}
	}
	return widgetIds
}

func (dashboard *Dashboard) CanUpdate(ctx context.Context, data StorableDashboardData, diff int) error {
	if dashboard.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot update a locked dashboard, please unlock the dashboard to update")
	}

	existingIDs := dashboard.Data.GetWidgetIds()
	newIDs := data.GetWidgetIds()
	newIdsMap := make(map[string]bool)
	for _, id := range newIDs {
		newIdsMap[id] = true
	}

	differenceMap := make(map[string]bool)
	difference := []string{}
	for _, id := range existingIDs {
		if _, found := newIdsMap[id]; !found && !differenceMap[id] {
			difference = append(difference, id)
			differenceMap[id] = true
		}
	}

	// Allow multiple decisions only if diff == 0
	if diff > 0 && len(difference) > diff {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "deleting more than one panel is not supported")
	}

	return nil
}

func (dashboard *Dashboard) Update(ctx context.Context, updatableDashboard UpdatableDashboard, updatedBy string, diff int) error {
	err := dashboard.CanUpdate(ctx, updatableDashboard, diff)
	if err != nil {
		return err
	}
	dashboard.UpdatedBy = updatedBy
	dashboard.UpdatedAt = time.Now()
	dashboard.Data = updatableDashboard
	return nil
}

func (dashboard *Dashboard) CanLockUnlock(role types.Role, updatedBy string) error {
	if dashboard.CreatedBy != updatedBy && role != types.RoleAdmin {
		return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "you are not authorized to lock/unlock this dashboard")
	}
	return nil
}

func (dashboard *Dashboard) LockUnlock(lock bool, role types.Role, updatedBy string) error {
	err := dashboard.CanLockUnlock(role, updatedBy)
	if err != nil {
		return err
	}
	dashboard.Locked = lock
	dashboard.UpdatedBy = updatedBy
	dashboard.UpdatedAt = time.Now()
	return nil
}

func (lockUnlockDashboard *LockUnlockDashboard) UnmarshalJSON(src []byte) error {
	var lockUnlock struct {
		Locked *bool `json:"lock"`
	}

	err := json.Unmarshal(src, &lockUnlock)
	if err != nil {
		return err
	}

	if lockUnlock.Locked == nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "lock is missing in the request payload")
	}

	lockUnlockDashboard.Locked = lockUnlock.Locked
	return nil
}

type Store interface {
	Create(context.Context, *StorableDashboard) error

	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableDashboard, error)

	List(context.Context, valuer.UUID) ([]*StorableDashboard, error)

	Update(context.Context, valuer.UUID, *StorableDashboard) error

	Delete(context.Context, valuer.UUID, valuer.UUID) error
}
