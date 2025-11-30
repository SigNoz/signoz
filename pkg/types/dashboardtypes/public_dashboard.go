package dashboardtypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodePublicDashboardInvalidInput  = errors.MustNewCode("public_dashboard_invalid_input")
	ErrCodePublicDashboardNotFound      = errors.MustNewCode("public_dashboard_not_found")
	ErrCodePublicDashboardAlreadyExists = errors.MustNewCode("public_dashboard_already_exists")
)

type StorablePublicDashboard struct {
	bun.BaseModel `bun:"table:public_dashboard,alias:public_dashboard"`

	types.Identifiable
	types.TimeAuditable
	TimeRangeEnabled bool   `bun:"time_range_enabled,type:boolean,notnull"`
	DefaultTimeRange string `bun:"default_time_range,type:text,notnull"`
	DashboardID      string `bun:"dashboard_id,type:text,notnull"`
}

type PublicDashboard struct {
	types.Identifiable
	types.TimeAuditable

	TimeRangeEnabled bool        `json:"timeRangeEnabled"`
	DefaultTimeRange string      `json:"defaultTimeRange"`
	DashboardID      valuer.UUID `json:"dashboardId"`
}

type GettablePublicDasbhboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
	PublicPath       string `json:"publicPath"`
}

type PostablePublicDashboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
}

type UpdatablePublicDashboard struct {
	TimeRangeEnabled bool   `json:"timeRangeEnabled"`
	DefaultTimeRange string `json:"defaultTimeRange"`
}

type GettablePublicDashboardData struct {
	Dashboard       *Dashboard                `json:"dashboard"`
	PublicDashboard *GettablePublicDasbhboard `json:"publicDashboard"`
}

func NewPublicDashboard(timeRangeEnabled bool, defaultTimeRange string, dashboardID valuer.UUID) *PublicDashboard {
	return &PublicDashboard{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		TimeRangeEnabled: timeRangeEnabled,
		DefaultTimeRange: defaultTimeRange,
		DashboardID:      dashboardID,
	}
}

func NewStorablePublicDashboardFromPublicDashboard(publicDashboard *PublicDashboard) *StorablePublicDashboard {
	return &StorablePublicDashboard{
		Identifiable:     publicDashboard.Identifiable,
		TimeAuditable:    publicDashboard.TimeAuditable,
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DefaultTimeRange: publicDashboard.DefaultTimeRange,
		DashboardID:      publicDashboard.DashboardID.StringValue(),
	}
}

func NewPublicDashboardFromStorablePublicDashboard(storable *StorablePublicDashboard) *PublicDashboard {
	return &PublicDashboard{
		Identifiable:     storable.Identifiable,
		TimeAuditable:    storable.TimeAuditable,
		TimeRangeEnabled: storable.TimeRangeEnabled,
		DefaultTimeRange: storable.DefaultTimeRange,
		DashboardID:      valuer.MustNewUUID(storable.DashboardID),
	}
}

func NewGettablePublicDashboard(publicDashboard *PublicDashboard) *GettablePublicDasbhboard {
	return &GettablePublicDasbhboard{
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DefaultTimeRange: publicDashboard.DefaultTimeRange,
		PublicPath:       publicDashboard.PublicPath(),
	}
}

func NewPublicDashboardDataFromDashboard(dashboard *Dashboard, publicDashboard *PublicDashboard) (*GettablePublicDashboardData, error) {
	type dashboardData struct {
		Widgets []struct {
			PanelTypes string `json:"panelTypes"`
			Query      struct {
				Builder struct {
					QueryData          []map[string]any `json:"queryData"`
					QueryFormulas      []map[string]any `json:"queryFormulas"`
					QueryTraceOperator []map[string]any `json:"queryTraceOperator"`
				} `json:"builder"`
				ClickhouseSQL []map[string]any `json:"clickhouse_sql"`
				PromQL        []map[string]any `json:"promql"`
				QueryType     string           `json:"queryType"`
			} `json:"query"`
		} `json:"widgets"`
	}

	dataJSON, err := json.Marshal(dashboard.Data)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "invalid dashboard data")
	}

	var data dashboardData
	err = json.Unmarshal(dataJSON, &data)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "invalid dashboard data")
	}

	for idx, widget := range data.Widgets {
		updatedQueryData := []map[string]any{}
		for _, queryData := range widget.Query.Builder.QueryData {
			updatedQueryMap := map[string]any{}
			updatedQueryMap["aggregations"] = queryData["aggregations"]
			updatedQueryMap["legend"] = queryData["legend"]
			updatedQueryMap["queryName"] = queryData["queryName"]
			updatedQueryMap["expression"] = queryData["expression"]
			updatedQueryMap["groupBy"] = queryData["groupBy"]
			updatedQueryMap["dataSource"] = queryData["dataSource"]
			updatedQueryData = append(updatedQueryData, updatedQueryMap)
		}
		widget.Query.Builder.QueryData = updatedQueryData

		updatedQueryFormulas := []map[string]any{}
		for _, queryFormula := range widget.Query.Builder.QueryFormulas {
			updatedQueryFormulaMap := map[string]any{}
			updatedQueryFormulaMap["legend"] = queryFormula["legend"]
			updatedQueryFormulaMap["queryName"] = queryFormula["queryName"]
			updatedQueryFormulaMap["expression"] = queryFormula["expression"]
			updatedQueryFormulas = append(updatedQueryFormulas, updatedQueryFormulaMap)
		}
		widget.Query.Builder.QueryFormulas = updatedQueryFormulas

		updatedQueryTraceOperator := []map[string]any{}
		for _, queryTraceOperator := range widget.Query.Builder.QueryTraceOperator {
			updatedQueryTraceOperatorMap := map[string]any{}
			updatedQueryTraceOperatorMap["aggregations"] = queryTraceOperator["aggregations"]
			updatedQueryTraceOperatorMap["legend"] = queryTraceOperator["legend"]
			updatedQueryTraceOperatorMap["queryName"] = queryTraceOperator["queryName"]
			updatedQueryTraceOperatorMap["expression"] = queryTraceOperator["expression"]
			updatedQueryTraceOperatorMap["groupBy"] = queryTraceOperator["groupBy"]
			updatedQueryTraceOperatorMap["dataSource"] = queryTraceOperator["dataSource"]
			updatedQueryTraceOperator = append(updatedQueryTraceOperator, updatedQueryTraceOperatorMap)
		}
		widget.Query.Builder.QueryTraceOperator = updatedQueryTraceOperator

		updatedClickhouseSQLQuery := []map[string]any{}
		for _, clickhouseSQLQuery := range widget.Query.ClickhouseSQL {
			updatedClickhouseSQLQueryMap := make(map[string]any)
			updatedClickhouseSQLQueryMap["legend"] = clickhouseSQLQuery["legend"]
			updatedClickhouseSQLQueryMap["name"] = clickhouseSQLQuery["name"]
			updatedClickhouseSQLQuery = append(updatedClickhouseSQLQuery, updatedClickhouseSQLQueryMap)
		}
		widget.Query.ClickhouseSQL = updatedClickhouseSQLQuery

		updatedPromQLQuery := []map[string]any{}
		for _, promQLQuery := range widget.Query.PromQL {
			updatedPromQLQueryMap := make(map[string]any)
			updatedPromQLQueryMap["legend"] = promQLQuery["legend"]
			updatedPromQLQueryMap["name"] = promQLQuery["name"]
			updatedPromQLQuery = append(updatedPromQLQuery, updatedPromQLQueryMap)
		}
		widget.Query.PromQL = updatedPromQLQuery

		if widgets, ok := dashboard.Data["widgets"].([]any); ok {
			if widgetMap, ok := widgets[idx].(map[string]any); ok {
				widgetMap["query"] = widget.Query
			}
		}
	}

	return &GettablePublicDashboardData{
		Dashboard: &Dashboard{
			Data: dashboard.Data,
		},
		PublicDashboard: &GettablePublicDasbhboard{
			TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
			DefaultTimeRange: publicDashboard.DefaultTimeRange,
			PublicPath:       publicDashboard.PublicPath(),
		},
	}, nil
}

func (typ *PublicDashboard) Update(timeRangeEnabled bool, defaultTimeRange string) {
	typ.TimeRangeEnabled = timeRangeEnabled
	typ.DefaultTimeRange = defaultTimeRange
	typ.UpdatedAt = time.Now()
}

func (typ *PublicDashboard) PublicPath() string {
	return "/public/dashboard/" + typ.ID.StringValue()
}

func (typ *PostablePublicDashboard) UnmarshalJSON(data []byte) error {
	type alias PostablePublicDashboard
	var temp alias

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	_, err := time.ParseDuration(temp.DefaultTimeRange)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "unable to parse defaultTimeRange %s", temp.DefaultTimeRange)
	}

	*typ = PostablePublicDashboard(temp)
	return nil
}

func (typ *UpdatablePublicDashboard) UnmarshalJSON(data []byte) error {
	type alias UpdatablePublicDashboard
	var temp alias

	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	_, err := time.ParseDuration(temp.DefaultTimeRange)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "unable to parse defaultTimeRange %s", temp.DefaultTimeRange)
	}

	*typ = UpdatablePublicDashboard(temp)
	return nil
}

func NewStatsFromStorablePublicDashboards(publicDashboards []*StorablePublicDashboard) map[string]any {
	stats := make(map[string]any)

	stats["public_dashboard.count"] = int64(len(publicDashboards))
	return stats
}
