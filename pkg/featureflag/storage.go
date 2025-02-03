package featureflag

import (
	"github.com/jmoiron/sqlx"
)

type FeatureStorage struct {
	db *sqlx.DB
}

func NewFeatureStorage(db *sqlx.DB) *FeatureStorage {
	return &FeatureStorage{db: db}
}

func (s *FeatureStorage) SaveFeatures(features []Feature) error {
	// TODO: implement this
	return nil
}
