package dashboardtypes

import (
	"context"
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gosimple/slug"
	"github.com/uptrace/bun"
)

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboard"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID  valuer.UUID           `json:"-" bun:"org_id,notnull"`
	Data   StorableDashboardData `json:"data" bun:"data,type:text,notnull"`
	Locked bool                  `json:"isLocked" bun:"locked,notnull,default:0"`
}

type Dashboard struct {
	ID string
	types.TimeAuditable
	types.UserAuditable
	OrgID  valuer.UUID
	Data   StorableDashboardData
	Locked bool
	Slug   string
	Title  string
}

type (
	StorableDashboardData map[string]interface{}

	GettableDashboard = Dashboard

	PostableDashboard = StorableDashboardData

	UpdatableDashboard = StorableDashboardData

	ListableDashboard []*GettableDashboard
)

func NewDashboard(orgID valuer.UUID, createdBy string, storableDashboardData *StorableDashboardData) (*Dashboard, error) {
	return &Dashboard{
		ID: valuer.GenerateUUID().StringValue(),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createdBy,
			UpdatedBy: createdBy,
		},
		OrgID:  orgID,
		Data:   *storableDashboardData,
		Locked: false,
	}, nil
}

func NewGettableDashboardsFromDashboards(dashboards []*Dashboard) ([]*GettableDashboard, error) {
	if dashboards == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert dashboards to gettable dashboards for <nil> dashboards")
	}

	gettableDashboards := make([]*GettableDashboard, len(dashboards))
	for idx, dashboard := range dashboards {
		gettableDashboard := NewGettableDashboardFromDashboard(dashboard)
		gettableDashboards[idx] = gettableDashboard
	}
	return gettableDashboards, nil
}

func NewGettableDashboardFromDashboard(dashboard *Dashboard) *GettableDashboard {
	return &GettableDashboard{
		ID:            dashboard.ID,
		TimeAuditable: dashboard.TimeAuditable,
		UserAuditable: dashboard.UserAuditable,
		OrgID:         dashboard.OrgID,
		Data:          dashboard.Data,
		Locked:        dashboard.Locked,
	}
}

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

func NewDashboardFromStorableDashboard(storableDashboard *StorableDashboard) (*Dashboard, error) {
	if storableDashboard == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert storable dashboard to dashboard entity for <nil> storable dashboard")
	}

	dashboard := &Dashboard{
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
	}
	dashboard.UpdateSlug()

	return dashboard, nil
}

func NewDashboardsFromStorableDashboards(storableDashboards []*StorableDashboard) ([]*Dashboard, error) {
	if storableDashboards == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot convert storable dashboards to dashboards entity for <nil> storable dashboards")
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

func NewDashboardFromUpdatableDashboard(id valuer.UUID, orgID valuer.UUID, data *PostableDashboard) (*Dashboard, error) {
	return &Dashboard{
		ID:    id.StringValue(),
		OrgID: orgID,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: "",
			UpdatedBy: "",
		},
		Data:   *data,
		Locked: false,
	}, nil
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

func (d *Dashboard) UpdateSlug() {
	var title string

	if val, ok := d.Data["title"]; ok {
		title = val.(string)
	}

	d.Slug = SlugifyTitle(title)
}

func SlugifyTitle(title string) string {
	s := slug.Make(strings.ToLower(title))
	if s == "" {
		// If the dashboard name is only characters outside of the
		// sluggable characters, the slug creation will return an
		// empty string which will mess up URLs. This failsafe picks
		// that up and creates the slug as a base64 identifier instead.
		s = base64.RawURLEncoding.EncodeToString([]byte(title))
		if slug.MaxLength != 0 && len(s) > slug.MaxLength {
			s = s[:slug.MaxLength]
		}
	}
	return s
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

type Store interface {
	Create(context.Context, *StorableDashboard) error

	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableDashboard, error)

	GetAll(context.Context, valuer.UUID) ([]*StorableDashboard, error)

	Update(context.Context, *StorableDashboard) error

	Delete(context.Context, valuer.UUID, valuer.UUID) error
}
