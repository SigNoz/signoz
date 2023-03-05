package explorer

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var db *sqlx.DB

type ExplorerQuery struct {
	UUID       string    `json:"uuid" db:"uuid"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
	SourcePage string    `json:"source_page" db:"source_page"`
	// 0 - false, 1 - true
	IsView    int8   `json:"is_view" db:"is_view"`
	Data      string `json:"data" db:"data"`
	ExtraData string `json:"extra_data" db:"extra_data"`
}

// InitWithDSN sets up setting up the connection pool global variable.
func InitWithDSN(dataSourceName string) (*sqlx.DB, error) {
	var err error

	db, err = sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}

	tableSchema := `CREATE TABLE IF NOT EXISTS explorer_queries (
		uuid TEXT PRIMARY KEY,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		source_page TEXT NOT NULL,
		is_view INTEGER NOT NULL,
		data TEXT NOT NULL,
		extra_data TEXT
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

func GetQueries() ([]*v3.ExplorerQuery, error) {
	var queries []ExplorerQuery
	err := db.Select(&queries, "SELECT * FROM explorer_queries")
	if err != nil {
		return nil, fmt.Errorf("Error in getting explorer queries: %s", err.Error())
	}

	var explorerQueries []*v3.ExplorerQuery
	for _, query := range queries {
		var compositeQuery v3.CompositeQuery
		err = json.Unmarshal([]byte(query.Data), &compositeQuery)
		if err != nil {
			return nil, fmt.Errorf("Error in unmarshalling explorer query data: %s", err.Error())
		}
		explorerQueries = append(explorerQueries, &v3.ExplorerQuery{
			UUID:           query.UUID,
			SourcePage:     query.SourcePage,
			CompositeQuery: &compositeQuery,
			IsView:         query.IsView,
			ExtraData:      query.ExtraData,
		})
	}
	return explorerQueries, nil
}

func CreateQuery(query v3.ExplorerQuery) (string, error) {
	data, err := json.Marshal(query.CompositeQuery)
	if err != nil {
		return "", fmt.Errorf("Error in marshalling explorer query data: %s", err.Error())
	}

	uuid_ := query.UUID

	if uuid_ == "" {
		uuid_ = uuid.New().String()
	}
	createdAt := time.Now()
	updatedAt := time.Now()

	_, err = db.Exec(
		"INSERT INTO explorer_queries (uuid, created_at, updated_at, source_page, is_view, data, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
		uuid_,
		createdAt,
		updatedAt,
		query.SourcePage,
		query.IsView,
		data,
		query.ExtraData,
	)
	if err != nil {
		return "", fmt.Errorf("Error in creating explorer query: %s", err.Error())
	}
	return uuid_, nil
}

func GetQuery(uuid_ string) (*v3.ExplorerQuery, error) {
	var query ExplorerQuery
	err := db.Get(&query, "SELECT * FROM explorer_queries WHERE uuid = ?", uuid_)
	if err != nil {
		return nil, fmt.Errorf("Error in getting explorer query: %s", err.Error())
	}

	var compositeQuery v3.CompositeQuery
	err = json.Unmarshal([]byte(query.Data), &compositeQuery)
	if err != nil {
		return nil, fmt.Errorf("Error in unmarshalling explorer query data: %s", err.Error())
	}
	return &v3.ExplorerQuery{
		UUID:           query.UUID,
		SourcePage:     query.SourcePage,
		CompositeQuery: &compositeQuery,
		IsView:         query.IsView,
		ExtraData:      query.ExtraData,
	}, nil
}

func UpdateQuery(uuid_ string, query v3.ExplorerQuery) error {
	data, err := json.Marshal(query.CompositeQuery)
	if err != nil {
		return fmt.Errorf("Error in marshalling explorer query data: %s", err.Error())
	}

	updatedAt := time.Now()

	_, err = db.Exec("UPDATE explorer_queries SET updated_at = ?, source_page = ?, is_view = ?, data = ?, extra_data = ? WHERE uuid = ?",
		updatedAt, query.SourcePage, query.IsView, data, query.ExtraData, uuid_)
	if err != nil {
		return fmt.Errorf("Error in updating explorer query: %s", err.Error())
	}
	return nil
}

func DeleteQuery(uuid_ string) error {
	_, err := db.Exec("DELETE FROM explorer_queries WHERE uuid = ?", uuid_)
	if err != nil {
		return fmt.Errorf("Error in deleting explorer query: %s", err.Error())
	}
	return nil
}
