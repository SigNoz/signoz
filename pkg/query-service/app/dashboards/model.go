package dashboards

import (
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
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// This time the global variable is unexported.
var db *sqlx.DB

// User for mapping job,instance from grafana
var instanceEQRE = regexp.MustCompile("instance(?s)=(?s)\\\"{{.instance}}\\\"")
var nodeEQRE = regexp.MustCompile("instance(?s)=(?s)\\\"{{.node}}\\\"")
var jobEQRE = regexp.MustCompile("job(?s)=(?s)\\\"{{.job}}\\\"")
var instanceRERE = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.instance}}\\\"")
var nodeRERE = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.node}}\\\"")
var jobRERE = regexp.MustCompile("job(?s)=~(?s)\\\"{{.job}}\\\"")

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
		return nil, fmt.Errorf("Error in creating dashboard table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		updated_at datetime NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating rules table: %s", err.Error())
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
		return nil, fmt.Errorf("Error in creating notification_channles table: %s", err.Error())
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
		return nil, fmt.Errorf("Error in creating ttl_status table: %s", err.Error())
	}

	return db, nil
}

type Dashboard struct {
	Id        int       `json:"id" db:"id"`
	Uuid      string    `json:"uuid" db:"uuid"`
	Slug      string    `json:"-" db:"-"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Title     string    `json:"-" db:"-"`
	Data      Data      `json:"data" db:"data"`
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
func CreateDashboard(data map[string]interface{}, fm interfaces.FeatureLookup) (*Dashboard, *model.ApiError) {
	dash := &Dashboard{
		Data: data,
	}
	dash.CreatedAt = time.Now()
	dash.UpdatedAt = time.Now()
	dash.UpdateSlug()
	dash.Uuid = uuid.New().String()

	map_data, err := json.Marshal(dash.Data)
	if err != nil {
		zap.S().Errorf("Error in marshalling data field in dashboard: ", dash, err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	if countTraceAndLogsPanel(data) > 0 {
		fErr := checkFeatureUsage(fm, countTraceAndLogsPanel(data))
		if fErr != nil {
			return nil, fErr
		}
	}

	// db.Prepare("Insert into dashboards where")
	result, err := db.Exec("INSERT INTO dashboards (uuid, created_at, updated_at, data) VALUES ($1, $2, $3, $4)", dash.Uuid, dash.CreatedAt, dash.UpdatedAt, map_data)

	if err != nil {
		zap.S().Errorf("Error in inserting dashboard data: ", dash, err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	lastInsertId, err := result.LastInsertId()

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	dash.Id = int(lastInsertId)

	traceAndLogsPanelUsage := countTraceAndLogsPanel(data)
	if traceAndLogsPanelUsage > 0 {
		updateFeatureUsage(fm, traceAndLogsPanelUsage)
	}

	return dash, nil
}

func GetDashboards() ([]Dashboard, *model.ApiError) {

	dashboards := []Dashboard{}
	query := fmt.Sprintf("SELECT * FROM dashboards;")

	err := db.Select(&dashboards, query)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return dashboards, nil
}

func DeleteDashboard(uuid string, fm interfaces.FeatureLookup) *model.ApiError {

	dashboard, dErr := GetDashboard(uuid)
	if dErr != nil {
		zap.S().Errorf("Error in getting dashboard: ", uuid, dErr)
		return dErr
	}

	query := fmt.Sprintf("DELETE FROM dashboards WHERE uuid='%s';", uuid)

	result, err := db.Exec(query)

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

	traceAndLogsPanelUsage := countTraceAndLogsPanel(dashboard.Data)
	if traceAndLogsPanelUsage > 0 {
		updateFeatureUsage(fm, -traceAndLogsPanelUsage)
	}

	return nil
}

func GetDashboard(uuid string) (*Dashboard, *model.ApiError) {

	dashboard := Dashboard{}
	query := fmt.Sprintf("SELECT * FROM dashboards WHERE uuid='%s';", uuid)

	err := db.Get(&dashboard, query)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no dashboard found with uuid: %s", uuid)}
	}

	return &dashboard, nil
}

func UpdateDashboard(uuid string, data map[string]interface{}, fm interfaces.FeatureLookup) (*Dashboard, *model.ApiError) {

	map_data, err := json.Marshal(data)
	if err != nil {
		zap.S().Errorf("Error in marshalling data field in dashboard: ", data, err)
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	dashboard, apiErr := GetDashboard(uuid)
	if apiErr != nil {
		return nil, apiErr
	}

	// check if the count of trace and logs QB panel has changed, if yes, then check feature flag count
	existingCount := countTraceAndLogsPanel(dashboard.Data)
	newCount := countTraceAndLogsPanel(data)
	if newCount > existingCount {
		err := checkFeatureUsage(fm, newCount-existingCount)
		if err != nil {
			return nil, err
		}
	}

	dashboard.UpdatedAt = time.Now()
	dashboard.Data = data

	// db.Prepare("Insert into dashboards where")
	_, err = db.Exec("UPDATE dashboards SET updated_at=$1, data=$2 WHERE uuid=$3 ", dashboard.UpdatedAt, map_data, dashboard.Uuid)

	if err != nil {
		zap.S().Errorf("Error in inserting dashboard data: ", data, err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if existingCount != newCount {
		// if the count of trace and logs panel has changed, we need to update feature flag count as well
		updateFeatureUsage(fm, newCount-existingCount)
	}
	return dashboard, nil
}

func updateFeatureUsage(fm interfaces.FeatureLookup, usage int64) *model.ApiError {
	feature, err := fm.GetFeatureFlag(model.QueryBuilderPanels)
	if err != nil {
		switch err.(type) {
		case model.ErrFeatureUnavailable:
			zap.S().Errorf("feature unavailable", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		default:
			zap.S().Errorf("feature check failed", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
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
			zap.S().Errorf("feature unavailable", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
			return model.BadRequest(err)
		default:
			zap.S().Errorf("feature check failed", zap.String("featureKey", model.QueryBuilderPanels), zap.Error(err))
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
				zap.S().Warnf("Skipping panel %d as it has no datasource", templateIdx)
				continue
			}
			// Skip if the source is not prometheus
			source, stringOk := template.Datasource.(string)
			if stringOk && !strings.Contains(strings.ToLower(source), "prometheus") {
				zap.S().Warnf("Skipping template %d as it is not prometheus", templateIdx)
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
				zap.S().Warnf("Skipping template %d as it is not prometheus", templateIdx)
				continue
			}

			if !stringOk && !structOk {
				zap.S().Warnf("Didn't recognize source, skipping")
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
			zap.S().Warnf("Skipping panel %d as it has no datasource", idx)
			continue
		}
		// Skip if the datasource is not prometheus
		source, stringOk := panel.Datasource.(string)
		if stringOk && !strings.Contains(strings.ToLower(source), "prometheus") {
			zap.S().Warnf("Skipping panel %d as it is not prometheus", idx)
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
			zap.S().Warnf("Skipping panel %d as it is not prometheus", idx)
			continue
		}

		if !stringOk && !structOk {
			zap.S().Warnf("Didn't recognize source, skipping")
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

func countTraceAndLogsPanel(data map[string]interface{}) int64 {
	count := int64(0)
	if data != nil && data["widgets"] != nil {
		widgets, ok := data["widgets"].(interface{})
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil {
						query, ok := sData["query"].(interface{}).(map[string]interface{})
						if ok && query["queryType"] == "builder" && query["builder"] != nil {
							builderData, ok := query["builder"].(interface{}).(map[string]interface{})
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
	return count
}
