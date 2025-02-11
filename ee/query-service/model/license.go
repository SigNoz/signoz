package model

import (
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	"github.com/pkg/errors"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type License struct {
	Key          string    `json:"key" db:"key"`
	ActivationId string    `json:"activationId" db:"activationId"`
	CreatedAt    time.Time `db:"created_at"`

	// PlanDetails contains the encrypted plan info
	PlanDetails string `json:"planDetails" db:"planDetails"`

	// stores parsed license details
	LicensePlan

	FeatureSet basemodel.FeatureSet

	// populated in case license has any errors
	ValidationMessage string `db:"validationMessage"`

	// used only for sending details to front-end
	IsCurrent bool `json:"isCurrent"`
}

func (l *License) MarshalJSON() ([]byte, error) {

	return json.Marshal(&struct {
		Key               string    `json:"key" db:"key"`
		ActivationId      string    `json:"activationId" db:"activationId"`
		ValidationMessage string    `db:"validationMessage"`
		IsCurrent         bool      `json:"isCurrent"`
		PlanKey           string    `json:"planKey"`
		ValidFrom         time.Time `json:"ValidFrom"`
		ValidUntil        time.Time `json:"ValidUntil"`
		Status            string    `json:"status"`
	}{
		Key:               l.Key,
		ActivationId:      l.ActivationId,
		IsCurrent:         l.IsCurrent,
		PlanKey:           l.PlanKey,
		ValidFrom:         time.Unix(l.ValidFrom, 0),
		ValidUntil:        time.Unix(l.ValidUntil, 0),
		Status:            l.Status,
		ValidationMessage: l.ValidationMessage,
	})
}

type LicensePlan struct {
	PlanKey    string `json:"planKey"`
	ValidFrom  int64  `json:"validFrom"`
	ValidUntil int64  `json:"validUntil"`
	Status     string `json:"status"`
}

type Licenses struct {
	TrialStart                   int64     `json:"trialStart"`
	TrialEnd                     int64     `json:"trialEnd"`
	OnTrial                      bool      `json:"onTrial"`
	WorkSpaceBlock               bool      `json:"workSpaceBlock"`
	TrialConvertedToSubscription bool      `json:"trialConvertedToSubscription"`
	GracePeriodEnd               int64     `json:"gracePeriodEnd"`
	Licenses                     []License `json:"licenses"`
}

type SubscriptionServerResp struct {
	Status string   `json:"status"`
	Data   Licenses `json:"data"`
}

type Plan struct {
	Name string `json:"name"`
}

type LicenseDB struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Data string `json:"data"`
}
type LicenseV3 struct {
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

func NewLicenseV3(data map[string]interface{}) (*LicenseV3, error) {
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
	case PlanNameTeams:
		features = append(features, ProPlan...)
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

	return &LicenseV3{
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

func NewLicenseV3WithIDAndKey(id string, key string, data map[string]interface{}) (*LicenseV3, error) {
	licenseDataWithIdAndKey := data
	licenseDataWithIdAndKey["id"] = id
	licenseDataWithIdAndKey["key"] = key
	return NewLicenseV3(licenseDataWithIdAndKey)
}

func ConvertLicenseV3ToLicenseV2(l *LicenseV3) *License {
	planKeyFromPlanName, ok := MapOldPlanKeyToNewPlanName[l.PlanName]
	if !ok {
		planKeyFromPlanName = Basic
	}
	return &License{
		Key:               l.Key,
		ActivationId:      "",
		PlanDetails:       "",
		FeatureSet:        l.Features,
		ValidationMessage: "",
		IsCurrent:         l.IsCurrent,
		LicensePlan: LicensePlan{
			PlanKey:    planKeyFromPlanName,
			ValidFrom:  l.ValidFrom,
			ValidUntil: l.ValidUntil,
			Status:     l.Status},
	}

}
