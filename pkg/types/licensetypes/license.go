package licensetypes

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableLicense struct {
	bun.BaseModel `bun:"table:license"`

	types.Identifiable
	types.TimeAuditable
	Key             string         `bun:"key,type:text,notnull,unique"`
	Data            map[string]any `bun:"data,type:text"`
	LastValidatedAt time.Time      `bun:"last_validated_at,notnull"`
	OrgID           valuer.UUID    `bun:"org_id,type:text,notnull" json:"orgID"`
}

func NewStorableLicense(ID valuer.UUID, key string, data map[string]any, createdAt, updatedAt, lastValidatedAt time.Time, organizationID valuer.UUID) *StorableLicense {
	return &StorableLicense{
		Identifiable: types.Identifiable{
			ID: ID,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		},
		Key:             key,
		Data:            data,
		LastValidatedAt: lastValidatedAt,
		OrgID:           organizationID,
	}
}

func GetActiveLicenseFromStorableLicenses(storableLicenses []*StorableLicense, organizationID valuer.UUID) (*License, error) {
	var activeLicense *License
	for _, storableLicense := range storableLicenses {
		license, err := NewLicenseWithIDAndKey(
			storableLicense.ID.StringValue(),
			storableLicense.Key,
			storableLicense.Data,
			storableLicense.CreatedAt,
			storableLicense.UpdatedAt,
			storableLicense.LastValidatedAt,
			storableLicense.OrgID,
		)
		if err != nil {
			return nil, err
		}

		if license.Status != "VALID" {
			continue
		}
		if activeLicense == nil &&
			(license.ValidFrom != 0) &&
			(license.ValidUntil == -1 || license.ValidUntil > time.Now().Unix()) {
			activeLicense = license
		}
		if activeLicense != nil &&
			license.ValidFrom > activeLicense.ValidFrom &&
			(license.ValidUntil == -1 || license.ValidUntil > time.Now().Unix()) {
			activeLicense = license
		}
	}

	if activeLicense == nil {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no active license found for the organization %s", organizationID.StringValue())
	}

	return activeLicense, nil
}

// this data excludes ID and Key
type License struct {
	ID              valuer.UUID
	Key             string
	Data            map[string]interface{}
	PlanName        string
	Features        []*featuretypes.GettableFeature
	Status          string
	ValidFrom       int64
	ValidUntil      int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
	LastValidatedAt time.Time
	OrganizationID  valuer.UUID
}

func extractKeyFromMapStringInterface[T any](data map[string]interface{}, key string) (T, error) {
	var zeroValue T
	if val, ok := data[key]; ok {
		if value, ok := val.(T); ok {
			return value, nil
		}
		return zeroValue, fmt.Errorf("%s key is not a valid %s", key, reflect.TypeOf(zeroValue))
	}
	return zeroValue, fmt.Errorf("%s key is missing", key)
}

func NewLicense(data []byte, createdAt, updatedAt, lastValidatedAt time.Time, organizationID valuer.UUID) (*License, error) {
	licenseData := map[string]any{}
	err := json.Unmarshal(data, &licenseData)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal license data")
	}

	var features []*featuretypes.GettableFeature

	// extract id from data
	licenseIDStr, err := extractKeyFromMapStringInterface[string](licenseData, "id")
	if err != nil {
		return nil, err
	}
	licenseID, err := valuer.NewUUID(licenseIDStr)
	if err != nil {
		return nil, err
	}
	delete(licenseData, "id")

	// extract key from data
	licenseKey, err := extractKeyFromMapStringInterface[string](licenseData, "key")
	if err != nil {
		return nil, err
	}
	delete(licenseData, "key")

	// extract status from data
	status, err := extractKeyFromMapStringInterface[string](licenseData, "status")
	if err != nil {
		return nil, err
	}

	planMap, err := extractKeyFromMapStringInterface[map[string]any](licenseData, "plan")
	if err != nil {
		return nil, err
	}

	planName, err := extractKeyFromMapStringInterface[string](planMap, "name")
	if err != nil {
		return nil, err
	}
	// if license status is invalid then default it to basic
	if status == LicenseStatusInvalid {
		planName = PlanNameBasic
	}

	featuresFromZeus := make([]*featuretypes.GettableFeature, 0)
	if _features, ok := licenseData["features"]; ok {
		featuresData, err := json.Marshal(_features)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal features data")
		}

		if err := json.Unmarshal(featuresData, &featuresFromZeus); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal features data")
		}
	}

	switch planName {
	case PlanNameEnterprise:
		features = append(features, EnterprisePlan...)
	case PlanNameBasic:
		features = append(features, BasicPlan...)
	default:
		features = append(features, BasicPlan...)
	}

	if len(featuresFromZeus) > 0 {
		for _, feature := range featuresFromZeus {
			exists := false
			for i, existingFeature := range features {
				if existingFeature.Name == feature.Name {
					features[i] = feature // Replace existing feature
					exists = true
					break
				}
			}
			if !exists {
				features = append(features, feature) // Append if it doesn't exist
			}
		}
	}
	licenseData["features"] = features

	_validFrom, err := extractKeyFromMapStringInterface[float64](licenseData, "valid_from")
	if err != nil {
		_validFrom = 0
	}
	validFrom := int64(_validFrom)

	_validUntil, err := extractKeyFromMapStringInterface[float64](licenseData, "valid_until")
	if err != nil {
		_validUntil = 0
	}
	validUntil := int64(_validUntil)

	return &License{
		ID:              licenseID,
		Key:             licenseKey,
		Data:            licenseData,
		PlanName:        planName,
		Features:        features,
		ValidFrom:       validFrom,
		ValidUntil:      validUntil,
		Status:          status,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
		LastValidatedAt: lastValidatedAt,
		OrganizationID:  organizationID,
	}, nil

}

func NewLicenseWithIDAndKey(id string, key string, data map[string]interface{}, createdAt, updatedAt, lastValidatedAt time.Time, organizationID valuer.UUID) (*License, error) {
	licenseDataWithIdAndKey := data
	licenseDataWithIdAndKey["id"] = id
	licenseDataWithIdAndKey["key"] = key

	licenseData, err := json.Marshal(licenseDataWithIdAndKey)
	if err != nil {
		return nil, err
	}
	return NewLicense(licenseData, createdAt, updatedAt, lastValidatedAt, organizationID)
}

type Store interface {
	Create(context.Context, *StorableLicense) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableLicense, error)
	GetAll(context.Context, valuer.UUID) ([]*StorableLicense, error)
	Update(context.Context, valuer.UUID, *StorableLicense) error

	// feature surrogate
	InitFeatures(context.Context, []*featuretypes.StorableFeature) error
	CreateFeature(context.Context, *featuretypes.StorableFeature) error
	GetFeature(context.Context, string) (*featuretypes.StorableFeature, error)
	GetAllFeatures(context.Context) ([]*featuretypes.StorableFeature, error)
	UpdateFeature(context.Context, *featuretypes.StorableFeature) error

	// ListOrganizations returns the list of orgs
	ListOrganizations(context.Context) ([]valuer.UUID, error)
}
