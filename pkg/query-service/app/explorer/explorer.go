package explorer

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var db *sqlx.DB

type ExplorerQuery struct {
	ID         int64  `json:"id" db:"id"`
	UUID       string `json:"uuid" db:"uuid"`
	CreatedAt  int64  `json:"created_at" db:"created_at"`
	UpdatedAt  int64  `json:"updated_at" db:"updated_at"`
	DataSource int    `json:"data_source" db:"data_source"`
	Data       string `json:"data" db:"data"`
}

// InitDB sets up setting up the connection pool global variable.
func InitWithDSN(dataSourceName string) (*sqlx.DB, error) {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	tableSchema := `CREATE TABLE IF NOT EXISTS explorer_queries (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL UNIQUE,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		data_source TEXT NOT NULL,
		data TEXT NOT NULL
	);`

	_, err = db.Exec(tableSchema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating explorer queries table: %s", err.Error())
	}

	return db, nil
}

func InitWithDB(sqlDB *sqlx.DB) {
	db = sqlDB
}

func GetQueries() ([]model.ExplorerQuery, error) {
	var queries []ExplorerQuery
	err := db.Select(&queries, "SELECT * FROM explorer_queries")
	if err != nil {
		return nil, fmt.Errorf("Error in getting explorer queries: %s", err.Error())
	}

	var explorerQueries []model.ExplorerQuery
	for _, query := range queries {
		dataSource := model.DataSource(query.DataSource)
		var compositeQuery model.CompositeMetricQuery
		err = json.Unmarshal([]byte(query.Data), &compositeQuery)
		if err != nil {
			return nil, fmt.Errorf("Error in unmarshalling explorer query data: %s", err.Error())
		}
		explorerQueries = append(explorerQueries, model.ExplorerQuery{
			DataSource:           dataSource,
			CompositeMetricQuery: &compositeQuery,
		})
	}
	return explorerQueries, nil
}

func CreateQuery(query model.ExplorerQuery) (string, error) {
	data, err := json.Marshal(query.CompositeMetricQuery)
	if err != nil {
		return "", fmt.Errorf("Error in marshalling explorer query data: %s", err.Error())
	}

	uuid := uuid.New().String()
	createdAt := time.Now().UnixMilli()
	updatedAt := time.Now().UnixMilli()

	_, err = db.Exec("INSERT INTO explorer_queries (uuid, created_at, updated_at, data_source, data) VALUES (?, ?, ?, ?, ?)",
		uuid, createdAt, updatedAt, query.DataSource, data)
	if err != nil {
		return "", fmt.Errorf("Error in creating explorer query: %s", err.Error())
	}
	return uuid, nil
}

func GetQuery(uuid string) (*model.ExplorerQuery, error) {
	var query ExplorerQuery
	err := db.Get(&query, "SELECT * FROM explorer_queries WHERE uuid = ?", uuid)
	if err != nil {
		return nil, fmt.Errorf("Error in getting explorer query: %s", err.Error())
	}

	dataSource := model.DataSource(query.DataSource)
	var compositeQuery model.CompositeMetricQuery
	err = json.Unmarshal([]byte(query.Data), &compositeQuery)
	if err != nil {
		return nil, fmt.Errorf("Error in unmarshalling explorer query data: %s", err.Error())
	}
	return &model.ExplorerQuery{
		DataSource:           dataSource,
		CompositeMetricQuery: &compositeQuery,
	}, nil
}

func UpdateQuery(uuid string, query model.ExplorerQuery) error {
	data, err := json.Marshal(query.CompositeMetricQuery)
	if err != nil {
		return fmt.Errorf("Error in marshalling explorer query data: %s", err.Error())
	}

	updatedAt := time.Now().UnixMilli()

	_, err = db.Exec("UPDATE explorer_queries SET updated_at = ?, data_source = ?, data = ? WHERE uuid = ?",
		updatedAt, query.DataSource, data, uuid)
	if err != nil {
		return fmt.Errorf("Error in updating explorer query: %s", err.Error())
	}
	return nil
}

func DeleteQuery(uuid string) error {
	_, err := db.Exec("DELETE FROM explorer_queries WHERE uuid = ?", uuid)
	if err != nil {
		return fmt.Errorf("Error in deleting explorer query: %s", err.Error())
	}
	return nil
}
