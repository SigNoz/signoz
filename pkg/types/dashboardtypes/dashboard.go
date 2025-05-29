package dashboardtypes

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboard"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Data   StorableDashboardData `json:"data" bun:"data,type:text,notnull"`
	Locked bool                  `json:"isLocked" bun:"locked,notnull,default:0"`
	OrgID  valuer.UUID           `json:"-" bun:"org_id,notnull"`
}

type Dashboard struct {
	types.TimeAuditable
	types.UserAuditable

	ID     string
	Data   StorableDashboardData
	Locked bool
	OrgID  valuer.UUID
}

type UpdatableDashboard struct {
	StorableDashboardData StorableDashboardData `json:"data"`
	Locked                bool                  `json:"locked"`
}

type (
	StorableDashboardData map[string]interface{}

	GettableDashboard = Dashboard

	PostableDashboard = StorableDashboardData

	ListableDashboard []*GettableDashboard
)

func NewStorableDashboardFromDashboard(dashboard *Dashboard) (*StorableDashboard, error) {
	if dashboard == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert <nil> dashboard to storable dashboard")
	}

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
	if storableDashboard == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert <nil> storable dashboard to dashboard")
	}

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
	if storableDashboards == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert <nil> storable dashboards to dashboards")
	}

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
	if dashboards == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert dashboards to gettable dashboards for <nil> dashboards")
	}

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
	if dashboard == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert <nil> dashboard to gettable dashboard")
	}

	return &GettableDashboard{
		ID:            dashboard.ID,
		TimeAuditable: dashboard.TimeAuditable,
		UserAuditable: dashboard.UserAuditable,
		OrgID:         dashboard.OrgID,
		Data:          dashboard.Data,
		Locked:        dashboard.Locked,
	}, nil
}

func (dashboard *Dashboard) Update(updatableDashboard *UpdatableDashboard) error {
	if dashboard.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot update a locked dashboard, please unlock the dashboard to update")
	}
	dashboard.Locked = updatableDashboard.Locked

	if !reflect.DeepEqual(updatableDashboard.StorableDashboardData, StorableDashboardData{}) {
		dashboard.Data = updatableDashboard.StorableDashboardData
	}
	return nil
}

func (storableDashboardData *StorableDashboardData) Scan(src interface{}) error {
	var data []byte
	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	}
	return json.Unmarshal(data, storableDashboardData)
}

func (storableDashboardData *StorableDashboardData) Value() (driver.Value, error) {
	return json.Marshal(storableDashboardData)
}

func GetWidgetIds(data map[string]interface{}) []string {
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

func GetIdDifference(existingIds []string, newIds []string) []string {
	// Convert newIds array to a map for faster lookups
	newIdsMap := make(map[string]bool)
	for _, id := range newIds {
		newIdsMap[id] = true
	}

	// Initialize a map to keep track of elements in the difference array
	differenceMap := make(map[string]bool)

	// Initialize the difference array
	difference := []string{}

	// Iterate through existingIds
	for _, id := range existingIds {
		// If the id is not found in newIds, and it's not already in the difference array
		if _, found := newIdsMap[id]; !found && !differenceMap[id] {
			difference = append(difference, id)
			differenceMap[id] = true // Mark the id as seen in the difference array
		}
	}

	return difference
}

func Intersection(a, b []int) (c []int) {
	m := make(map[int]bool)

	for _, item := range a {
		m[item] = true
	}

	for _, item := range b {
		if _, ok := m[item]; ok {
			c = append(c, item)
		}
	}
	return
}

type Store interface {
	Create(context.Context, *StorableDashboard) error

	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableDashboard, error)

	GetAll(context.Context, valuer.UUID) ([]*StorableDashboard, error)

	Update(context.Context, valuer.UUID, *StorableDashboard) error

	Delete(context.Context, valuer.UUID, valuer.UUID) error
}
