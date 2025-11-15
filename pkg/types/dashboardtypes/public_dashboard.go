package dashboardtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodePublicDashboardNotFound      = errors.MustNewCode("public_dashboard_not_found")
	ErrCodePublicDashboardAlreadyExists = errors.MustNewCode("public_dashboard_already_exists")
)

type StorablePublicDashboard struct {
	bun.BaseModel `bun:"table:public_dashboard"`

	types.Identifiable
	types.TimeAuditable
	TimeRangeEnabled bool   `bun:"time_range_enabled,type:boolean,notnull"`
	DashboardID      string `bun:"dashboard_id,type:text,notnull"`
}

type PublicDashboard struct {
	types.Identifiable
	types.TimeAuditable

	TimeRangeEnabled bool        `json:"timeRangeEnabled"`
	DashboardID      valuer.UUID `json:"dashboardId"`
}

type PostablePublicDashboard struct {
	TimeRangeEnabled bool `json:"timeRangeEnabled"`
}

type UpdatablePublicDashboard struct {
	TimeRangeEnabled bool `json:"timeRangeEnabled"`
}

type GettablePublicDashboardData = Dashboard

func NewPublicDashboard(timeRangeEnabled bool, dashboardID valuer.UUID) *PublicDashboard {
	return &PublicDashboard{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		TimeRangeEnabled: timeRangeEnabled,
		DashboardID:      dashboardID,
	}
}

func NewStorablePublicDashboardFromPublicDashboard(publicDashboard *PublicDashboard) *StorablePublicDashboard {
	return &StorablePublicDashboard{
		Identifiable:     publicDashboard.Identifiable,
		TimeAuditable:    publicDashboard.TimeAuditable,
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DashboardID:      publicDashboard.DashboardID.StringValue(),
	}
}

func NewPublicDashboardFromStorablePublicDashboard(storable *StorablePublicDashboard) *PublicDashboard {
	return &PublicDashboard{
		Identifiable:     storable.Identifiable,
		TimeAuditable:    storable.TimeAuditable,
		TimeRangeEnabled: storable.TimeRangeEnabled,
		DashboardID:      valuer.MustNewUUID(storable.DashboardID),
	}
}

func NewPublicDashboardDataFromDashboard(dashboard *Dashboard) *GettablePublicDashboardData {
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
												query = updatedQueryMap
											}
										}

										queryFormulas, ok := builderQuery["queryFormulas"].([]any)
										if ok {
											for _, queryFormula := range queryFormulas {
												updatedQueryFormulaMap := make(map[string]any)
												queryFormulaMap, ok := queryFormula.(map[string]any)
												if ok {
													updatedQueryFormulaMap["legend"] = queryFormulaMap["legend"]
													updatedQueryFormulaMap["queryName"] = queryFormulaMap["queryName"]
													updatedQueryFormulaMap["expression"] = queryFormulaMap["expression"]
												}
												queryFormula = updatedQueryFormulaMap
											}
										}

										queryTraceOperator, ok := builderQuery["queryTraceOperator"].([]any)
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
												query = updatedQueryTraceOperatorMap
											}
										}
									}
								case "clickhouse_sql":
									delete(query, "builder")
									delete(query, "promql")
									clickhouseSQLQuery, ok := query["clickhouse_sql"].([]any)
									if ok {
										for _, clickhouseSQLQuery := range clickhouseSQLQuery {
											updatedClickhouseSQLQueryMap := make(map[string]any)
											clickhouseSQLQueryMap, ok := clickhouseSQLQuery.(map[string]any)
											if ok {
												updatedClickhouseSQLQueryMap["legend"] = clickhouseSQLQueryMap["legend"]
												updatedClickhouseSQLQueryMap["name"] = clickhouseSQLQueryMap["name"]
											}
											clickhouseSQLQuery = updatedClickhouseSQLQueryMap
										}
									}
								case "promql":
									delete(query, "builder")
									delete(query, "clickhouse_sql")
									promQLQuery, ok := query["promql"].([]any)
									if ok {
										for _, promQLQuery := range promQLQuery {
											updatedPromQLQueryMap := make(map[string]any)
											promQLQueryMap, ok := promQLQuery.(map[string]any)
											if ok {
												updatedPromQLQueryMap["legend"] = promQLQueryMap["legend"]
												updatedPromQLQueryMap["name"] = promQLQueryMap["name"]
											}
											promQLQuery = updatedPromQLQueryMap
										}
									}
								}
							}

						}
					}
				}
			}
		}
	}
	return &GettablePublicDashboardData{
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
	}
}

func (typ *PublicDashboard) Update(timeRangeEnabled bool) {
	typ.TimeRangeEnabled = timeRangeEnabled
	typ.UpdatedAt = time.Now()
}
