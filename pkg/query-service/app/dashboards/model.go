package dashboards

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"

	"go.signoz.io/signoz/pkg/query-service/telemetry"
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

	telemetry.GetInstance().SetDashboardsInfoCallback(GetDashboardsInfo)

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

	// if the total count of panels has reduced by more than 1,
	// return error
	existingIds := getWidgetIds(dashboard.Data)
	newIds := getWidgetIds(data)

	differenceIds := getIdDifference(existingIds, newIds)

	if len(differenceIds) > 1 {
		return nil, model.BadRequest(fmt.Errorf("deleting more than one panel is not supported"))
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

// GetDashboardsInfo returns analytics data for dashboards
func GetDashboardsInfo(ctx context.Context) (*model.DashboardsInfo, error) {
	dashboardsInfo := model.DashboardsInfo{}
	// fetch dashboards from dashboard db
	query := "SELECT data FROM dashboards"
	var dashboardsData []Dashboard
	err := db.Select(&dashboardsData, query)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return &dashboardsInfo, err
	}
	totalDashboardsWithPanelAndName := 0
	var dashboardNames []string
	count := 0
	for _, dashboard := range dashboardsData {
		if isDashboardWithPanelAndName(dashboard.Data) {
			totalDashboardsWithPanelAndName = totalDashboardsWithPanelAndName + 1
		}
		dashboardName := extractDashboardName(dashboard.Data)
		if dashboardName != "" {
			dashboardNames = append(dashboardNames, dashboardName)
		}
		dashboardInfo := countPanelsInDashboard(dashboard.Data)
		dashboardsInfo.LogsBasedPanels += dashboardInfo.LogsBasedPanels
		dashboardsInfo.TracesBasedPanels += dashboardInfo.TracesBasedPanels
		dashboardsInfo.MetricBasedPanels += dashboardsInfo.MetricBasedPanels
		if isDashboardWithTSV2(dashboard.Data) {
			count = count + 1
		}
	}

	dashboardsInfo.DashboardNames = dashboardNames
	dashboardsInfo.TotalDashboards = len(dashboardsData)
	dashboardsInfo.TotalDashboardsWithPanelAndName = totalDashboardsWithPanelAndName
	dashboardsInfo.QueriesWithTSV2 = count
	return &dashboardsInfo, nil
}

func isDashboardWithTSV2(data map[string]interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return false
	}
	return strings.Contains(string(jsonData), "time_series_v2")
}

func isDashboardWithPanelAndName(data map[string]interface{}) bool {
	isDashboardName := false
	isDashboardWithPanelAndName := false
	if data != nil && data["title"] != nil && data["widgets"] != nil {
		title, ok := data["title"].(string)
		if ok && title != "Sample Title" {
			isDashboardName = true
		}
		widgets, ok := data["widgets"]
		if ok && isDashboardName {
			data, ok := widgets.([]interface{})
			if ok && len(data) > 0 {
				isDashboardWithPanelAndName = true
			}
		}
	}

	return isDashboardWithPanelAndName
}

func extractDashboardName(data map[string]interface{}) string {

	if data != nil && data["title"] != nil {
		title, ok := data["title"].(string)
		if ok {
			return title
		}
	}

	return ""
}

func countPanelsInDashboard(data map[string]interface{}) model.DashboardsInfo {
	var logsPanelCount, tracesPanelCount, metricsPanelCount int
	// totalPanels := 0
	if data != nil && data["widgets"] != nil {
		widgets, ok := data["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil {
						// totalPanels++
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
												tracesPanelCount++
											} else if data["dataSource"] == "metrics" {
												metricsPanelCount++
											} else if data["dataSource"] == "logs" {
												logsPanelCount++
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
	return model.DashboardsInfo{
		LogsBasedPanels:   logsPanelCount,
		TracesBasedPanels: tracesPanelCount,
		MetricBasedPanels: metricsPanelCount,
	}
}
