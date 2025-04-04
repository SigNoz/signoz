package featuretypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeNoFeaturesFound     = errors.MustNewCode("no_features_found")
	ErrCodeFeatureNotFound     = errors.MustNewCode("feature_not_found")
	ErrCodeFeatureKindMismatch = errors.MustNewCode("feature_kind_mismatch")
)

type GettableOrgFeature struct {
	*StorableOrgFeature `json:"org_feature"`
	StorableFeature     *StorableFeature `json:"feature"`
}

type Feature struct {
	types.Identifiable
	// Name is the name of the feature flag.
	Name Name `bun:"name" json:"name"`

	// Kind is the kind of the feature flag.
	Kind Kind `bun:"kind" json:"kind"`

	// Description is the description of the feature flag.
	Description string `bun:"description" json:"description"`

	// Stage is the stage of the feature flag.
	Stage Stage `bun:"stage" json:"stage"`

	// Immutable is whether the feature flag is immutable.
	Immutable bool `bun:"immutable" json:"immutable"`

	// Default is the default value of the feature flag.
	Default any `bun:"default" json:"default"`
}

type StorableFeature struct {
	bun.BaseModel `bun:"table:feature"`
	Feature
	types.TimeAuditable
}

type StorableOrgFeature struct {
	bun.BaseModel `bun:"table:org_feature"`

	types.Identifiable
	FeatureID valuer.UUID `bun:"feature_id" json:"feature_id"`
	IsChanged bool        `bun:"is_changed" json:"is_changed"`
	Value     any         `bun:"value" json:"value"`
	OrgID     valuer.UUID `bun:"org_id" json:"org_id"`
	types.TimeAuditable
}

// func NewGettableFeaturesFromOrgFeatures(orgFeatures []*OrgFeature, registry *Registry) []GettableFeature {
// 	gettableFeatures := make([]GettableFeature, 0)
// 	for _, orgFeature := range orgFeatures {
// 		feature, err := registry.Get(orgFeature.FeatureID)
// 		if err != nil {
// 			continue
// 		}

// 		gettableFeatures = append(gettableFeatures, GettableFeature{
// 			OrgFeature: orgFeature,
// 			Feature:    feature,
// 		})
// 	}

// 	return gettableFeatures
// }

func (f *StorableOrgFeature) Update(feature Feature) error {
	return nil
}

type FeatureStore interface {
	// Set creates or updates a feature
	Set(context.Context, ...StorableFeature) error

	// SetForOrg creates or updates a feature for an org
	SetOrgFeature(context.Context, map[Action][]*StorableOrgFeature) error

	// GetForOrg returns the feature for the given orgID
	GetOrgFeatures(context.Context, valuer.UUID) ([]*StorableOrgFeature, error)
}
