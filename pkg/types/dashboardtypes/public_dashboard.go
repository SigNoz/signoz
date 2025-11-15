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
	bun.BaseModel `bun:"table:public_dashboard"`

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

func NewPublicDashboardDataFromDashboard(dashboard *Dashboard, publicDashboard *PublicDashboard) *GettablePublicDashboardData {
	if dashboard.Data != nil && dashboard.Data["widgets"] != nil {
		widgets, ok := dashboard.Data["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					widgetMap, ok := widget.(map[string]interface{})
					if ok && widgetMap["query"] != nil {
						query, ok := widgetMap["query"].(map[string]any)
						if ok {
							queryType, ok := query["queryType"].(string)
							if ok {
								switch queryType {
								case "builder":
									delete(query, "clickhouse_sql")
									delete(query, "promql")
									builderQuery, ok := query["builder"].(map[string]any)
									if ok {
										queryData, ok := builderQuery["queryData"].([]any)
										updatedQueryData := []any{}
										if ok {
											for _, query := range queryData {
												updatedQueryMap := make(map[string]any)
												queryMap, ok := query.(map[string]any)
												if ok {
													updatedQueryMap["aggregation"] = queryMap["aggregation"]
													updatedQueryMap["legend"] = queryMap["legend"]
													updatedQueryMap["queryName"] = queryMap["queryName"]
													updatedQueryMap["expression"] = queryMap["expression"]
												}
												updatedQueryData = append(updatedQueryData, updatedQueryMap)
											}
										}
										builderQuery["queryData"] = updatedQueryData

										queryFormulas, ok := builderQuery["queryFormulas"].([]any)
										updatedQueryFormula := []any{}
										if ok {
											for _, queryFormula := range queryFormulas {
												updatedQueryFormulaMap := make(map[string]any)
												queryFormulaMap, ok := queryFormula.(map[string]any)
												if ok {
													updatedQueryFormulaMap["legend"] = queryFormulaMap["legend"]
													updatedQueryFormulaMap["queryName"] = queryFormulaMap["queryName"]
													updatedQueryFormulaMap["expression"] = queryFormulaMap["expression"]
												}
												updatedQueryFormula = append(updatedQueryFormula, updatedQueryFormulaMap)
											}
										}
										builderQuery["queryFormulas"] = updatedQueryFormula

										queryTraceOperator, ok := builderQuery["queryTraceOperator"].([]any)
										updatedQueryTraceOperator := []any{}
										if ok {
											for _, query := range queryTraceOperator {
												updatedQueryTraceOperatorMap := make(map[string]any)
												queryMap, ok := query.(map[string]any)
												if ok {
													updatedQueryTraceOperatorMap["aggregation"] = queryMap["aggregation"]
													updatedQueryTraceOperatorMap["legend"] = queryMap["legend"]
													updatedQueryTraceOperatorMap["queryName"] = queryMap["queryName"]
													updatedQueryTraceOperatorMap["expression"] = queryMap["expression"]
												}
												updatedQueryTraceOperator = append(updatedQueryTraceOperator, updatedQueryTraceOperatorMap)
											}
										}
										builderQuery["queryTraceOperator"] = updatedQueryTraceOperator
									}
								case "clickhouse_sql":
									delete(query, "builder")
									delete(query, "promql")
									clickhouseSQLQuery, ok := query["clickhouse_sql"].([]any)
									updatedClickhouseSQLQuery := []any{}
									if ok {
										for _, clickhouseSQLQuery := range clickhouseSQLQuery {
											updatedClickhouseSQLQueryMap := make(map[string]any)
											clickhouseSQLQueryMap, ok := clickhouseSQLQuery.(map[string]any)
											if ok {
												updatedClickhouseSQLQueryMap["legend"] = clickhouseSQLQueryMap["legend"]
												updatedClickhouseSQLQueryMap["name"] = clickhouseSQLQueryMap["name"]
											}
											updatedClickhouseSQLQuery = append(updatedClickhouseSQLQuery, updatedClickhouseSQLQueryMap)
										}
									}
									query["clickhouse_sql"] = updatedClickhouseSQLQuery
								case "promql":
									delete(query, "builder")
									delete(query, "clickhouse_sql")
									promQLQuery, ok := query["promql"].([]any)
									updatedPromQLQuery := []any{}
									if ok {
										for _, promQLQuery := range promQLQuery {
											updatedPromQLQueryMap := make(map[string]any)
											promQLQueryMap, ok := promQLQuery.(map[string]any)
											if ok {
												updatedPromQLQueryMap["legend"] = promQLQueryMap["legend"]
												updatedPromQLQueryMap["name"] = promQLQueryMap["name"]
											}
											updatedPromQLQuery = append(updatedPromQLQuery, updatedPromQLQueryMap)
										}
									}
									query["promql"] = updatedPromQLQuery
								}
							}

						}
					}
				}
			}
		}
	}
	return &GettablePublicDashboardData{
		Dashboard: &Dashboard{
			ID: dashboard.ID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: dashboard.TimeAuditable.CreatedAt,
				UpdatedAt: dashboard.TimeAuditable.UpdatedAt,
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: dashboard.UserAuditable.CreatedBy,
				UpdatedBy: dashboard.UserAuditable.UpdatedBy,
			},
			Data: dashboard.Data,
		},
		PublicDashboard: &GettablePublicDasbhboard{
			TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
			DefaultTimeRange: publicDashboard.DefaultTimeRange,
			PublicPath:       publicDashboard.PublicPath(),
		},
	}
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

	if temp.DefaultTimeRange == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "defaultTimeRange cannot be empty")
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

	if temp.DefaultTimeRange == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodePublicDashboardInvalidInput, "defaultTimeRange cannot be empty")
	}

	*typ = UpdatablePublicDashboard(temp)
	return nil
}
