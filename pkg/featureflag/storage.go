package featureflag

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

type FeatureStorage struct {
	db *sql.DB
}

func NewFeatureStorage(db *sql.DB) *FeatureStorage {
	return &FeatureStorage{db: db}
}

func (s *FeatureStorage) SaveFeatures(features []Feature) error {
	// TODO: implement this
	return nil
}
