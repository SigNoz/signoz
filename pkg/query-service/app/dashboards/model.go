package dashboards

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jmoiron/sqlx"
	"github.com/mitchellh/mapstructure"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// This time the global variable is unexported.
var db *sqlx.DB

// User for mapping job,instance from grafana
var (
	instanceEQRE = regexp.MustCompile("instance(?s)=(?s)\\\"{{.instance}}\\\"")
	nodeEQRE     = regexp.MustCompile("instance(?s)=(?s)\\\"{{.node}}\\\"")
	jobEQRE      = regexp.MustCompile("job(?s)=(?s)\\\"{{.job}}\\\"")
	instanceRERE = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.instance}}\\\"")
	nodeRERE     = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.node}}\\\"")
	jobRERE      = regexp.MustCompile("job(?s)=~(?s)\\\"{{.job}}\\\"")
)

// InitDB sets up setting up the connection pool global variable.
func InitDB(dataSourceName string) (*sqlx.DB, error) {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	table_schema := `CREATE TABLE IF NOT EXISTS dashboards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL UNIQUE,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating dashboard table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		updated_at datetime NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating rules table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS notification_channels (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating notification_channles table: %s", err.Error())
	}

	tableSchema := `CREATE TABLE IF NOT EXISTS planned_maintenance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT,
		alert_ids TEXT,
		schedule TEXT NOT NULL,
		created_at datetime NOT NULL,
		created_by TEXT NOT NULL,
		updated_at datetime NOT NULL,
		updated_by TEXT NOT NULL
	);`
	_, err = db.Exec(tableSchema)
	if err != nil {
		return nil, fmt.Errorf("error in creating planned_maintenance table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS ttl_status (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		transaction_id TEXT NOT NULL,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		table_name TEXT NOT NULL,
		ttl INTEGER DEFAULT 0,
		cold_storage_ttl INTEGER DEFAULT 0,
		status TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating ttl_status table: %s", err.Error())
	}

	// sqlite does not support "IF NOT EXISTS"
	createdAt := `ALTER TABLE rules ADD COLUMN created_at datetime;`
	_, err = db.Exec(createdAt)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column created_at to rules table: %s", err.Error())
	}

	createdBy := `ALTER TABLE rules ADD COLUMN created_by TEXT;`
	_, err = db.Exec(createdBy)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column created_by to rules table: %s", err.Error())
	}

	updatedBy := `ALTER TABLE rules ADD COLUMN updated_by TEXT;`
	_, err = db.Exec(updatedBy)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column updated_by to rules table: %s", err.Error())
	}

	createdBy = `ALTER TABLE dashboards ADD COLUMN created_by TEXT;`
	_, err = db.Exec(createdBy)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column created_by to dashboards table: %s", err.Error())
	}

	updatedBy = `ALTER TABLE dashboards ADD COLUMN updated_by TEXT;`
	_, err = db.Exec(updatedBy)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column updated_by to dashboards table: %s", err.Error())
	}

	locked := `ALTER TABLE dashboards ADD COLUMN locked INTEGER DEFAULT 0;`
	_, err = db.Exec(locked)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return nil, fmt.Errorf("error in adding column locked to dashboards table: %s", err.Error())
	}

	return db, nil
}

type Dashboard struct {
	Id        int       `json:"id" db:"id"`
	Uuid      string    `json:"uuid" db:"uuid"`
	Slug      string    `json:"-" db:"-"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	CreateBy  *string   `json:"created_by" db:"created_by"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	UpdateBy  *string   `json:"updated_by" db:"updated_by"`
	Title     string    `json:"-" db:"-"`
	Data      Data      `json:"data" db:"data"`
	Locked    *int      `json:"isLocked" db:"locked"`
}

type Data map[string]interface{}

// func (c *Data) Value() (driver.Value, error) {
// 	if c != nil {
// 		b, err := json.Marshal(c)
// 		if err != nil {
// 			return nil, err
// 		}
// 		return string(b), nil
// 	}
// 	return nil, nil
// }

func (c *Data) Scan(src interface{}) error {
	var data []byte
	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	}
	return json.Unmarshal(data, c)
}

// CreateDashboard creates a new dashboard
func CreateDashboard(ctx context.Context, data map[string]interface{}, fm interfaces.FeatureLookup) (*Dashboard, *model.ApiError) {
	dash := &Dashboard{
		Data: data,
	}
	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
	}
	dash.CreatedAt = time.Now()
	dash.CreateBy = &userEmail
	dash.UpdatedAt = time.Now()
	dash.UpdateBy = &userEmail
	dash.UpdateSlug()
	dash.Uuid = uuid.New().String()
	if data["uuid"] != nil {
		dash.Uuid = data["uuid"].(string)
	}

	mapData, err := json.Marshal(dash.Data)
	if err != nil {
		zap.L().Error("Error in marshalling data field in dashboard: ", zap.Any("dashboard", dash), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	newCount, _ := countTraceAndLogsPanel(data)
	if newCount > 0 {
		fErr := checkFeatureUsage(fm, newCount)
		if fErr != nil {
			return nil, fErr
		}
	}

	result, err := db.Exec("INSERT INTO dashboards (uuid, created_at, created_by, updated_at, updated_by, data) VALUES ($1, $2, $3, $4, $5, $6)",
		dash.Uuid, dash.CreatedAt, userEmail, dash.UpdatedAt, userEmail, mapData)

	if err != nil {
		zap.L().Error("Error in inserting dashboard data: ", zap.Any("dashboard", dash), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	lastInsertId, err := result.LastInsertId()
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	dash.Id = int(lastInsertId)

	traceAndLogsPanelUsage, _ := countTraceAndLogsPanel(data)
	if traceAndLogsPanelUsage > 0 {
		updateFeatureUsage(fm, traceAndLogsPanelUsage)
	}

	return dash, nil
}

func GetDashboards(ctx context.Context) ([]Dashboard, *model.ApiError) {

	dashboards := []Dashboard{}
	query := `SELECT * FROM dashboards`

	err := db.Select(&dashboards, query)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return dashboards, nil
}

func DeleteDashboard(ctx context.Context, uuid string, fm interfaces.FeatureLookup) *model.ApiError {

	dashboard, dErr := GetDashboard(ctx, uuid)
	if dErr != nil {
		zap.L().Error("Error in getting dashboard: ", zap.String("uuid", uuid), zap.Any("error", dErr))
		return dErr
	}

	if user := common.GetUserFromContext(ctx); user != nil {
		if dashboard.Locked != nil && *dashboard.Locked == 1 {
			return model.BadRequest(fmt.Errorf("dashboard is locked, please unlock the dashboard to be able to delete it"))
		}
	}

	query := `DELETE FROM dashboards WHERE uuid=?`

	result, err := db.Exec(query, uuid)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if affectedRows == 0 {
		return &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no dashboard found with uuid: %s", uuid)}
	}

	traceAndLogsPanelUsage, _ := countTraceAndLogsPanel(dashboard.Data)
	if traceAndLogsPanelUsage > 0 {
		updateFeatureUsage(fm, -traceAndLogsPanelUsage)
	}

	return nil
}

func GetDashboard(ctx context.Context, uuid string) (*Dashboard, *model.ApiError) {

	dashboard := Dashboard{}
	query := `SELECT * FROM dashboards WHERE uuid=?`

	err := db.Get(&dashboard, query, uuid)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no dashboard found with uuid: %s", uuid)}
	}

	return &dashboard, nil
}

func UpdateDashboard(ctx context.Context, uuid string, data map[string]interface{}, fm interfaces.FeatureLookup) (*Dashboard, *model.ApiError) {

	mapData, err := json.Marshal(data)
	if err != nil {
		zap.L().Error("Error in marshalling data field in dashboard: ", zap.Any("data", data), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	dashboard, apiErr := GetDashboard(ctx, uuid)
	if apiErr != nil {
		return nil, apiErr
	}

	var userEmail string
	if user := common.GetUserFromContext(ctx); user != nil {
		userEmail = user.Email
		if dashboard.Locked != nil && *dashboard.Locked == 1 {
			return nil, model.BadRequest(fmt.Errorf("dashboard is locked, please unlock the dashboard to be able to edit it"))
		}
	}

	// check if the count of trace and logs QB panel has changed, if yes, then check feature flag count
	existingCount, existingTotal := countTraceAndLogsPanel(dashboard.Data)
	newCount, newTotal := countTraceAndLogsPanel(data)
	if newCount > existingCount {
		err := checkFeatureUsage(fm, newCount-existingCount)
		if err != nil {
			return nil, err
		}
	}

	if existingTotal > newTotal && existingTotal-newTotal > 1 {
		// if the total count of panels has reduced by more than 1,
		// return error
		existingIds := getWidgetIds(dashboard.Data)
		newIds := getWidgetIds(data)

		differenceIds := getIdDifference(existingIds, newIds)

		if len(differenceIds) > 1 {
			return nil, model.BadRequest(fmt.Errorf("deleting more than one panel is not supported"))
		}

	}

	dashboard.UpdatedAt = time.Now()
	dashboard.UpdateBy = &userEmail
	dashboard.Data = data

	_, err = db.Exec("UPDATE dashboards SET updated_at=$1, updated_by=$2, data=$3 WHERE uuid=$4;",
		dashboard.UpdatedAt, userEmail, mapData, dashboard.Uuid)

	if err != nil {
		zap.L().Error("Error in inserting dashboard data", zap.Any("data", data), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if existingCount != newCount {
		// if the count of trace and logs panel has changed, we need to update feature flag count as well
		updateFeatureUsage(fm, newCount-existingCount)
	}
	return dashboard, nil
}

func LockUnlockDashboard(ctx context.Context, uuid string, lock bool) *model.ApiError {
	var query string
	if lock {
		query = `UPDATE dashboards SET locked=1 WHERE uuid=?;`
	} else {
		query = `UPDATE dashboards SET locked=0 WHERE uuid=?;`
	}

	_, err := db.Exec(query, uuid)

	if err != nil {
		zap.L().Error("Error in updating dashboard", zap.String("uuid", uuid), zap.Error(err))
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return nil
}

func updateFeatureUsage(fm interfaces.FeatureLookup, usage int64) *model.ApiError {
	feature, err := fm.GetFeatureFlag(model.QueryBuilderPanels)
	if err != nil {
		switch err.(type) {
		case model.ErrFeatureUnavailable:
			zap.L().Error("feature unavailable", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		default:
			zap.L().Error("feature check failed", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		}
	}
	feature.Usage += usage
	if feature.Usage >= feature.UsageLimit && feature.UsageLimit != -1 {
		feature.Active = false
	}
	if feature.Usage < feature.UsageLimit || feature.UsageLimit == -1 {
		feature.Active = true
	}
	err = fm.UpdateFeatureFlag(feature)
	if err != nil {
		return model.BadRequest(err)
	}

	return nil
}

func checkFeatureUsage(fm interfaces.FeatureLookup, usage int64) *model.ApiError {
	feature, err := fm.GetFeatureFlag(model.QueryBuilderPanels)
	if err != nil {
		switch err.(type) {
		case model.ErrFeatureUnavailable:
			zap.L().Error("feature unavailable", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		default:
			zap.L().Error("feature check failed", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		}
	}
	if feature.UsageLimit-(feature.Usage+usage) < 0 && feature.UsageLimit != -1 {
		return model.BadRequest(fmt.Errorf("feature usage exceeded"))
	}
	return nil
}

// UpdateSlug updates the slug
func (d *Dashboard) UpdateSlug() {
	var title string

	if val, ok := d.Data["title"]; ok {
		title = val.(string)
	}

	d.Slug = SlugifyTitle(title)
}

func IsPostDataSane(data *map[string]interface{}) error {
	val, ok := (*data)["title"]
	if !ok || val == nil {
		return fmt.Errorf("title not found in post data")
	}

	return nil
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

func widgetFromPanel(panel model.Panels, idx int, variables map[string]model.Variable) *model.Widget {
	widget := model.Widget{
		Description:    panel.Description,
		ID:             strconv.Itoa(idx),
		IsStacked:      false,
		NullZeroValues: "zero",
		Opacity:        "1",
		PanelTypes:     "TIME_SERIES", // TODO: Need to figure out how to get this
		Query: model.Query{
			ClickHouse: []model.ClickHouseQueryDashboard{
				{
					Disabled: false,
					Legend:   "",
					Name:     "A",
					Query:    "",
				},
			},
			MetricsBuilder: model.MetricsBuilder{
				Formulas: []string{},
				QueryBuilder: []model.QueryBuilder{
					{
						AggregateOperator: 1,
						Disabled:          false,
						GroupBy:           []string{},
						Legend:            "",
						MetricName:        "",
						Name:              "A",
						ReduceTo:          1,
					},
				},
			},
			PromQL:    []model.PromQueryDashboard{},
			QueryType: int(model.PROM),
		},
		QueryData: model.QueryDataDashboard{
			Data: model.Data{
				QueryData: []interface{}{},
			},
		},
		Title:     panel.Title,
		YAxisUnit: panel.FieldConfig.Defaults.Unit,
		QueryType: int(model.PROM), // TODO: Supprot for multiple query types
	}
	for _, target := range panel.Targets {
		if target.Expr != "" {
			for name := range variables {
				target.Expr = strings.ReplaceAll(target.Expr, "$"+name, "{{"+"."+name+"}}")
				target.Expr = strings.ReplaceAll(target.Expr, "$"+"__rate_interval", "5m")
			}

			// prometheus receiver in collector maps job,instance as service_name,service_instance_id
			target.Expr = instanceEQRE.ReplaceAllString(target.Expr, "service_instance_id=\"{{.instance}}\"")
			target.Expr = nodeEQRE.ReplaceAllString(target.Expr, "service_instance_id=\"{{.node}}\"")
			target.Expr = jobEQRE.ReplaceAllString(target.Expr, "service_name=\"{{.job}}\"")
			target.Expr = instanceRERE.ReplaceAllString(target.Expr, "service_instance_id=~\"{{.instance}}\"")
			target.Expr = nodeRERE.ReplaceAllString(target.Expr, "service_instance_id=~\"{{.node}}\"")
			target.Expr = jobRERE.ReplaceAllString(target.Expr, "service_name=~\"{{.job}}\"")

			widget.Query.PromQL = append(
				widget.Query.PromQL,
				model.PromQueryDashboard{
					Disabled: false,
					Legend:   target.LegendFormat,
					Name:     target.RefID,
					Query:    target.Expr,
				},
			)
		}
	}
	return &widget
}

func TransformGrafanaJSONToSignoz(grafanaJSON model.GrafanaJSON) model.DashboardData {
	var toReturn model.DashboardData
	toReturn.Title = grafanaJSON.Title
	toReturn.Tags = grafanaJSON.Tags
	toReturn.Variables = make(map[string]model.Variable)

	for templateIdx, template := range grafanaJSON.Templating.List {
		var sort, typ, textboxValue, customValue, queryValue string
		if template.Sort == 1 {
			sort = "ASC"
		} else if template.Sort == 2 {
			sort = "DESC"
		} else {
			sort = "DISABLED"
		}

		if template.Type == "query" {
			if template.Datasource == nil {
				zap.L().Warn("Skipping panel as it has no datasource", zap.Int("templateIdx", templateIdx))
				continue
			}
			// Skip if the source is not prometheus
			source, stringOk := template.Datasource.(string)
			if stringOk && !strings.Contains(strings.ToLower(source), "prometheus") {
				zap.L().Warn("Skipping template as it is not prometheus", zap.Int("templateIdx", templateIdx))
				continue
			}
			var result model.Datasource
			var structOk bool
			if reflect.TypeOf(template.Datasource).Kind() == reflect.Map {
				err := mapstructure.Decode(template.Datasource, &result)
				if err == nil {
					structOk = true
				}
			}
			if result.Type != "prometheus" && result.Type != "" {
				zap.L().Warn("Skipping template as it is not prometheus", zap.Int("templateIdx", templateIdx))
				continue
			}

			if !stringOk && !structOk {
				zap.L().Warn("Didn't recognize source, skipping")
				continue
			}
			typ = "QUERY"
		} else if template.Type == "custom" {
			typ = "CUSTOM"
		} else if template.Type == "textbox" {
			typ = "TEXTBOX"
			text, ok := template.Current.Text.(string)
			if ok {
				textboxValue = text
			}
			array, ok := template.Current.Text.([]string)
			if ok {
				textboxValue = strings.Join(array, ",")
			}
		} else {
			continue
		}

		var selectedValue string
		text, ok := template.Current.Value.(string)
		if ok {
			selectedValue = text
		}
		array, ok := template.Current.Value.([]string)
		if ok {
			selectedValue = strings.Join(array, ",")
		}

		toReturn.Variables[template.Name] = model.Variable{
			AllSelected:   false,
			CustomValue:   customValue,
			Description:   template.Label,
			MultiSelect:   template.Multi,
			QueryValue:    queryValue,
			SelectedValue: selectedValue,
			ShowALLOption: template.IncludeAll,
			Sort:          sort,
			TextboxValue:  textboxValue,
			Type:          typ,
		}
	}

	row := 0
	idx := 0
	for _, panel := range grafanaJSON.Panels {
		if panel.Type == "row" {
			if panel.Panels != nil && len(panel.Panels) > 0 {
				for _, innerPanel := range panel.Panels {
					if idx%3 == 0 {
						row++
					}
					toReturn.Layout = append(
						toReturn.Layout,
						model.Layout{
							X: idx % 3 * 4,
							Y: row * 3,
							W: 4,
							H: 3,
							I: strconv.Itoa(idx),
						},
					)

					toReturn.Widgets = append(toReturn.Widgets, *widgetFromPanel(innerPanel, idx, toReturn.Variables))
					idx++
				}
			}
			continue
		}
		if panel.Datasource == nil {
			zap.L().Warn("Skipping panel as it has no datasource", zap.Int("idx", idx))
			continue
		}
		// Skip if the datasource is not prometheus
		source, stringOk := panel.Datasource.(string)
		if stringOk && !strings.Contains(strings.ToLower(source), "prometheus") {
			zap.L().Warn("Skipping panel as it is not prometheus", zap.Int("idx", idx))
			continue
		}
		var result model.Datasource
		var structOk bool
		if reflect.TypeOf(panel.Datasource).Kind() == reflect.Map {
			err := mapstructure.Decode(panel.Datasource, &result)
			if err == nil {
				structOk = true
			}
		}
		if result.Type != "prometheus" && result.Type != "" {
			zap.L().Warn("Skipping panel as it is not prometheus", zap.Int("idx", idx))
			continue
		}

		if !stringOk && !structOk {
			zap.L().Warn("Didn't recognize source, skipping")
			continue
		}

		// Create a panel from "gridPos"

		if idx%3 == 0 {
			row++
		}
		toReturn.Layout = append(
			toReturn.Layout,
			model.Layout{
				X: idx % 3 * 4,
				Y: row * 3,
				W: 4,
				H: 3,
				I: strconv.Itoa(idx),
			},
		)

		toReturn.Widgets = append(toReturn.Widgets, *widgetFromPanel(panel, idx, toReturn.Variables))
		idx++
	}
	return toReturn
}

func countTraceAndLogsPanel(data map[string]interface{}) (int64, int64) {
	count := int64(0)
	totalPanels := int64(0)
	if data != nil && data["widgets"] != nil {
		widgets, ok := data["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil {
						totalPanels++
						query, ok := sData["query"].(map[string]interface{})
						if ok && query["queryType"] == "builder" && query["builder"] != nil {
							builderData, ok := query["builder"].(map[string]interface{})
							if ok && builderData["queryData"] != nil {
								builderQueryData, ok := builderData["queryData"].([]interface{})
								if ok {
									for _, queryData := range builderQueryData {
										data, ok := queryData.(map[string]interface{})
										if ok {
											if data["dataSource"] == "traces" || data["dataSource"] == "logs" {
												count++
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
	}
	return count, totalPanels
}

func getWidgetIds(data map[string]interface{}) []string {
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

func getIdDifference(existingIds []string, newIds []string) []string {
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
