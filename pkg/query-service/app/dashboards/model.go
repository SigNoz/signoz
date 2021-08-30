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
)

// const (
// 	ErrorNone           ErrorType = ""
// 	ErrorTimeout        ErrorType = "timeout"
// 	ErrorCanceled       ErrorType = "canceled"
// 	ErrorExec           ErrorType = "execution"
// 	ErrorBadData        ErrorType = "bad_data"
// 	ErrorInternal       ErrorType = "internal"
// 	ErrorUnavailable    ErrorType = "unavailable"
// 	ErrorNotFound       ErrorType = "not_found"
// 	ErrorNotImplemented ErrorType = "not_implemented"
// )

// This time the global variable is unexported.
var db *sqlx.DB

// InitDB sets up setting up the connection pool global variable.
func InitDB(dataSourceName string) error {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return err
	}

	table_schema := `CREATE TABLE IF NOT EXISTS dashboards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL,
		slug TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		title TEXT NOT NULL,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("Error in creating dashboard table: ", err.Error())
	}

	return nil
}

type Dashboard struct {
	Id        int64                  `json:"id", db:"id"`
	Uuid      string                 `json:"uuid", db:"uuid"`
	Slug      string                 `json:"slug", db:"slug"`
	CreatedAt time.Time              `json:"created_at", db:"created_at"`
	UpdatedAt time.Time              `json:"updated_at", db:"updated_at"`
	Title     string                 `json:"title", db:"title"`
	Data      map[string]interface{} `json:"data", db:"data"`
}

// CreateDashboard creates a new dashboard
func CreateDashboard(title string) (*Dashboard, error) {
	dash := &Dashboard{
		Data: make(map[string]interface{}),
	}
	dash.Data["title"] = title
	dash.Title = title
	dash.CreatedAt = time.Now()
	dash.UpdatedAt = time.Now()
	dash.UpdateSlug()
	dash.Uuid = uuid.New().String()

	map_data, err := json.Marshal(dash.Data)

	// db.Prepare("Insert into dashboards where")
	result, err := db.Exec("INSERT INTO dashboards (uuid, slug, created_at, updated_at, title, data) VALUES ($1, $2, $3, $4, $5, $6)", dash.Uuid, dash.Slug, dash.CreatedAt, dash.UpdatedAt, dash.Title, map_data)

	if err != nil {
		return nil, err
	}
	dash.Id, err = result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return dash, nil
}

// UpdateSlug updates the slug
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
