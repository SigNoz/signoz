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

func (dashboard *Dashboard) CanUpdate(data StorableDashboardData) error {
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
	if len(difference) > 1 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "deleting more than one panel is not supported")
	}

	return nil
}

func (dashboard *Dashboard) Update(updatableDashboard UpdatableDashboard, updatedBy string) error {
	err := dashboard.CanUpdate(updatableDashboard)
	if err != nil {
		return err
	}
	dashboard.UpdatedBy = updatedBy
	dashboard.UpdatedAt = time.Now()
	dashboard.Data = updatableDashboard
	return nil
}

func (dashboard *Dashboard) CanLockUnlock(ctx context.Context, updatedBy string) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	if dashboard.CreatedBy != updatedBy || claims.Role != types.RoleAdmin {
		return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "you are not authorized to lock/unlock this dashboard")
	}
	return nil
}

func (dashboard *Dashboard) LockUnlock(ctx context.Context, lock bool, updatedBy string) error {
	err := dashboard.CanLockUnlock(ctx, updatedBy)
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
