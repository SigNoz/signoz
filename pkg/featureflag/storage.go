package featureflag

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
)

type Store interface {
	ListOrgIDs(ctx context.Context) ([]string, error)
	GetFeatureFlag(ctx context.Context, orgId string, name Flag) (Feature, error)
	ListFeatureFlags(ctx context.Context, orgId string) ([]Feature, error)
	UpdateFeatureFlag(ctx context.Context, orgId string, name Flag, feature Feature) error
	SaveFeatureFlags(ctx context.Context, orgId string, features []Feature) error
}

type FeatureStorage struct {
	db *bun.DB
}

func NewFeatureStorage(db *bun.DB) Store {
	return &FeatureStorage{db: db}
}

func (s *FeatureStorage) ListOrgIDs(ctx context.Context) ([]string, error) {
	var orgIds []string
	err := s.db.NewSelect().
		Table("organizations").
		Model(&orgIds).
		Column("id").
		Scan(ctx)
	return orgIds, err
}

func (s *FeatureStorage) GetFeatureFlag(ctx context.Context, orgId string, name Flag) (Feature, error) {
	var dbFeature Feature
	err := s.db.NewSelect().
		Model(&dbFeature).
		Where("org_id = ?", orgId).
		Where("name = ?", name.String()).
		Scan(ctx)
	if err != nil {
		return Feature{}, fmt.Errorf("failed to get feature flag: %w", err)
	}
	return dbFeature, nil
}

// will return all features for an org
func (s *FeatureStorage) ListFeatureFlags(ctx context.Context, orgId string) ([]Feature, error) {
	var features []Feature
	err := s.db.NewSelect().
		Model(&features).
		Where("org_id = ?", orgId).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return features, nil
}

// UpdateFeature updates a specific feature by flag for an org
func (s *FeatureStorage) UpdateFeatureFlag(ctx context.Context, orgId string, name Flag, feature Feature) error {
	_, err := s.db.NewUpdate().
		Model(&feature).
		Set("description = ?, stage = ?, is_active = ?, is_changed = true", feature.Description, feature.Stage.String(), feature.IsActive).
		Where("org_id = ?", orgId).
		Where("name = ?", name.String()).
		Where("is_changeable = true").
		Exec(ctx)
	return err
}

// SaveFeatureFlags saves a list of features to the database
// we write all the features to the db first time.
// if any update for zeus/constants it will update the flags as they will have IsChangeable = false
func (s *FeatureStorage) SaveFeatureFlags(ctx context.Context, orgId string, features []Feature) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	// Fetch all existing features for the orgId
	var existingFeatures []Feature
	err = tx.NewSelect().
		Model(&existingFeatures).
		Where("org_id = ?", orgId).
		Scan(ctx)
	if err != nil {
		return err
	}

	// Convert the slice to a map
	existingFeaturesMap := make(map[string]Feature)
	for _, feature := range existingFeatures {
		existingFeaturesMap[feature.Name.String()] = feature
	}

	for _, feature := range features {
		feature.OrgId = orgId
		dbFeature, exists := existingFeaturesMap[feature.Name.String()]
		if !exists {
			// Feature not present, create it
			_, err = tx.NewInsert().
				Model(&feature).
				Exec(ctx)
			if err != nil {
				return err
			}
		} else {
			// Feature present, check if value is changed using reflect.DeepEqual
			if !dbFeature.Equals(feature) {
				// If a feature i.e constants/from zeus is not changeable and is changed then we replace it
				// if feature default value is changed in constants/zeus then we update it if the feature value is not changed by user
				if !dbFeature.IsChangeable || !dbFeature.IsChanged {
					// Update the feature
					_, err = tx.NewUpdate().
						Model(&feature).
						Where("org_id = ? AND name = ?", feature.OrgId, feature.Name.String()).
						Exec(ctx)
					if err != nil {
						return err
					}
				}
			}
		}
	}

	return err
}
