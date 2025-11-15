package dashboardtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	TypeableResourceDashboard   = authtypes.MustNewTypeableMetaResource(authtypes.MustNewName("dashboard"))
	TypeableResourcesDashboards = authtypes.MustNewTypeableMetaResources(authtypes.MustNewName("dashboards"))
)

var (
	ErrCodeDashboardInvalidInput = errors.MustNewCode("dashboard_invalid_input")
	ErrCodeDashboardNotFound     = errors.MustNewCode("dashboard_not_found")
)

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboard,alias:dashboard"`

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

func NewDashboardFromStorableDashboard(storableDashboard *StorableDashboard) *Dashboard {
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
	}
}

func NewDashboardsFromStorableDashboards(storableDashboards []*StorableDashboard) []*Dashboard {
	dashboards := make([]*Dashboard, len(storableDashboards))
	for idx, storableDashboard := range storableDashboards {
		dashboards[idx] = NewDashboardFromStorableDashboard(storableDashboard)
	}

	return dashboards
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

func (dashboard *Dashboard) GetWidgetQuery(startTime, endTime uint64, widgetIndex int64) (*querybuildertypesv5.QueryRangeRequest, error) {
	compositeQueries := querybuildertypesv5.CompositeQuery{}
	if dashboard.Data == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	if dashboard.Data["widgets"] == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	widgets, ok := dashboard.Data["widgets"]
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	data, ok := widgets.([]interface{})
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	if len(data) < int(widgetIndex) {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	widget := data[widgetIndex]

	widgetData, ok := widget.(map[string]any)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	query, ok := widgetData["query"]
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	queryData, ok := query.(map[string]any)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	queryType, ok := queryData["queryType"]
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	queryTypeStr, ok := queryType.(string)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	switch queryTypeStr {
	case "builder":
		builder, ok := queryData["builder"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		builderData, ok := builder.(map[string]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		// builder query has three sections: queryData, queryFormulas, queryTraceOperator
		// query data
		builderQueryData, ok := builderData["queryData"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		builderQueryDataSlice, ok := builderQueryData.([]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		for _, query := range builderQueryDataSlice {
			compositeQueries.Queries = append(compositeQueries.Queries, querybuildertypesv5.QueryEnvelope{Type: querybuildertypesv5.QueryTypeBuilder, Spec: query})
		}

		// query formulas
		builderQueryFormulas, ok := builderData["queryFormulas"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		builderQueryFormulasSlice, ok := builderQueryFormulas.([]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		for _, query := range builderQueryFormulasSlice {
			compositeQueries.Queries = append(compositeQueries.Queries, querybuildertypesv5.QueryEnvelope{Type: querybuildertypesv5.QueryTypeFormula, Spec: query})
		}

		// query trace operator
		builderQueryTraceOperator, ok := builderData["queryTraceOperator"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		builderQueryTraceOperatorSlice, ok := builderQueryTraceOperator.([]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		for _, query := range builderQueryTraceOperatorSlice {
			compositeQueries.Queries = append(compositeQueries.Queries, querybuildertypesv5.QueryEnvelope{Type: querybuildertypesv5.QueryTypeTraceOperator, Spec: query})
		}

	case "clickhouse_sql":
		chQuery, ok := queryData["clickhouse_sql"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		chQueryData, ok := chQuery.([]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		for _, query := range chQueryData {
			compositeQueries.Queries = append(compositeQueries.Queries, querybuildertypesv5.QueryEnvelope{Type: querybuildertypesv5.QueryTypeClickHouseSQL, Spec: query})
		}
	case "promql":
		promQuery, ok := queryData["promql"]
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		promQueryData, ok := promQuery.([]any)
		if !ok {
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
		}

		for _, query := range promQueryData {
			compositeQueries.Queries = append(compositeQueries.Queries, querybuildertypesv5.QueryEnvelope{Type: querybuildertypesv5.QueryTypePromQL, Spec: query})
		}

	default:
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	panelType, ok := widgetData["panelTypes"]
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	panelTypeStr, ok := panelType.(string)
	if !ok {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "")
	}

	return &querybuildertypesv5.QueryRangeRequest{
		SchemaVersion:  "v1",
		Start:          startTime,
		End:            endTime,
		RequestType:    dashboard.getQueryRequestTypeFromPanelType(panelTypeStr),
		CompositeQuery: compositeQueries,
	}, nil

}

func (dashboard *Dashboard) getQueryRequestTypeFromPanelType(panelType string) querybuildertypesv5.RequestType {
	switch panelType {
	case "graph":
	case "bar":
		return querybuildertypesv5.RequestTypeTimeSeries
	case "table":
	case "pie":
	case "value":
		return querybuildertypesv5.RequestTypeScalar
	case "trace":
		return querybuildertypesv5.RequestTypeTrace
	case "list":
		return querybuildertypesv5.RequestTypeRaw
	case "histogram":
		return querybuildertypesv5.RequestTypeDistribution
	}

	return querybuildertypesv5.RequestTypeUnknown
}
