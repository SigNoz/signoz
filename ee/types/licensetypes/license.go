package licensetypes

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
)

// validate and update license every 24 hours
var ValidationFrequency = 24 * 60 * time.Minute

type StorableLicense struct {
	bun.BaseModel `bun:"table:license"`

	types.Identifiable
	types.TimeAuditable
	Key   string `bun:"key,type:text,notnull,unique"`
	Data  string `bun:"data,type:text"`
	OrgID string `bun:"org_id,type:text,notnull" json:"orgID"`
}

func NewStorableLicense(ID valuer.UUID, key string, data string, organizationID valuer.UUID) *StorableLicense {
	return &StorableLicense{
		Identifiable: types.Identifiable{
			ID: ID,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Key:   key,
		Data:  data,
		OrgID: organizationID.StringValue(),
	}
}

type GettableLicense struct {
	ID         string
	Key        string
	Data       map[string]interface{}
	PlanName   string
	Features   basemodel.FeatureSet
	Status     string
	IsCurrent  bool
	ValidFrom  int64
	ValidUntil int64
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

func NewGettableLicense(data map[string]interface{}) (*GettableLicense, error) {
	var features basemodel.FeatureSet

	// extract id from data
	licenseID, err := extractKeyFromMapStringInterface[string](data, "id")
	if err != nil {
		return nil, err
	}
	delete(data, "id")

	// extract key from data
	licenseKey, err := extractKeyFromMapStringInterface[string](data, "key")
	if err != nil {
		return nil, err
	}
	delete(data, "key")

	// extract status from data
	status, err := extractKeyFromMapStringInterface[string](data, "status")
	if err != nil {
		return nil, err
	}

	planMap, err := extractKeyFromMapStringInterface[map[string]any](data, "plan")
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

	featuresFromZeus := basemodel.FeatureSet{}
	if _features, ok := data["features"]; ok {
		featuresData, err := json.Marshal(_features)
		if err != nil {
			return nil, errors.Wrap(err, "failed to marshal features data")
		}

		if err := json.Unmarshal(featuresData, &featuresFromZeus); err != nil {
			return nil, errors.Wrap(err, "failed to unmarshal features data")
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
	data["features"] = features

	_validFrom, err := extractKeyFromMapStringInterface[float64](data, "valid_from")
	if err != nil {
		_validFrom = 0
	}
	validFrom := int64(_validFrom)

	_validUntil, err := extractKeyFromMapStringInterface[float64](data, "valid_until")
	if err != nil {
		_validUntil = 0
	}
	validUntil := int64(_validUntil)

	return &GettableLicense{
		ID:         licenseID,
		Key:        licenseKey,
		Data:       data,
		PlanName:   planName,
		Features:   features,
		ValidFrom:  validFrom,
		ValidUntil: validUntil,
		Status:     status,
	}, nil

}

func NewGettableLicenseWithIDAndKey(id string, key string, data map[string]interface{}) (*GettableLicense, error) {
	licenseDataWithIdAndKey := data
	licenseDataWithIdAndKey["id"] = id
	licenseDataWithIdAndKey["key"] = key
	return NewGettableLicense(licenseDataWithIdAndKey)
}

type Store interface {
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableLicense, error)
	GetAll(context.Context, valuer.UUID) ([]*StorableLicense, error)
	GetActive(context.Context) (*StorableLicense, error)
	Create(context.Context, *StorableLicense) error
	Update(context.Context, *StorableLicense) error
	CreateFeature(context.Context)
	GetFeature(context.Context)
	GetAllFeatures(context.Context)
	UpdateFeature(context.Context)
	InitFeatures(context.Context)

	// ListOrgs returns the list of orgs
	ListOrgs(context.Context) ([]string, error)
}
