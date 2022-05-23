package dashboards

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jmoiron/sqlx"
	qsconfig "go.signoz.io/query-service/config"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

// This time the global variable is unexported.
var db *sqlx.DB

func InitDB(kind qsconfig.DBEngine, conn *sqlx.DB) error {
	db = conn

	switch kind {
	case qsconfig.PG:
		return initPG(conn)
	case qsconfig.SQLLITE:
		return initSQL(conn)
	default:
		return fmt.Errorf("database engine not supported")
	}
}

func initSQL(conn *sqlx.DB) error {
	var err error

	table_schema := `CREATE TABLE IF NOT EXISTS dashboards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL UNIQUE,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating dashboard table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		updated_at datetime NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating rules table: %s", err.Error())
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
		return fmt.Errorf("Error in creating notification_channles table: %s", err.Error())
	}

	return nil
}

// InitPG sets up setting up the PG connection pool global variable.
func initPG(conn *sqlx.DB) error {
	var err error

	table_schema := `CREATE TABLE IF NOT EXISTS dashboards (
		id SERIAL PRIMARY KEY,
		uuid TEXT NOT NULL UNIQUE,
		created_at timestamp NOT NULL,
		updated_at timestamp NOT NULL,
		data JSONB NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating dashboard table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS rules (
		id SERIAL PRIMARY KEY,
		updated_at timestamp NOT NULL,
		deleted bool DEFAULT false NOT NULL,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating rules table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS notification_channels (
		id SERIAL PRIMARY KEY,
		created_at timestamp NOT NULL,
		updated_at timestamp NOT NULL,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL,
		deleted bool DEFAULT false NOT NULL,
		data JSONB NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating notification_channles table: %s", err.Error())
	}

	return nil
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
func CreateDashboard(data map[string]interface{}) (*Dashboard, *model.ApiError) {
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
	var lastInsertId int64
	// db.Prepare("Insert into dashboards where")
	err = db.QueryRow("INSERT INTO dashboards (uuid, created_at, updated_at, data) VALUES ($1, $2, $3, $4) RETURNING id", dash.Uuid, dash.CreatedAt, dash.UpdatedAt, map_data).Scan(&lastInsertId)

	if err != nil {
		zap.S().Errorf("Error in inserting dashboard data: ", dash, err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	dash.Id = int(lastInsertId)

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

func DeleteDashboard(uuid string) *model.ApiError {

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

func UpdateDashboard(uuid string, data map[string]interface{}) (*Dashboard, *model.ApiError) {

	map_data, err := json.Marshal(data)
	if err != nil {
		zap.S().Errorf("Error in marshalling data field in dashboard: ", data, err)
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	dashboard, apiErr := GetDashboard(uuid)
	if apiErr != nil {
		return nil, apiErr
	}

	dashboard.UpdatedAt = time.Now()
	dashboard.Data = data

	// db.Prepare("Insert into dashboards where")
	_, err = db.Exec("UPDATE dashboards SET updated_at=$1, data=$2 WHERE uuid=$3 ", dashboard.UpdatedAt, map_data, dashboard.Uuid)

	if err != nil {
		zap.S().Errorf("Error in inserting dashboard data: ", data, err)
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return dashboard, nil
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
