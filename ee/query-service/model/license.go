package model

import (
	"encoding/base64"
	"encoding/json"
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

func (l *License) ParsePlan() error {
	l.LicensePlan = LicensePlan{}

	planData, err := base64.StdEncoding.DecodeString(l.PlanDetails)
	if err != nil {
		return err
	}

	plan := LicensePlan{}
	err = json.Unmarshal([]byte(planData), &plan)
	if err != nil {
		l.ValidationMessage = "failed to parse plan from license"
		return errors.Wrap(err, "failed to parse plan from license")
	}

	l.LicensePlan = plan
	l.ParseFeatures()
	return nil
}

func (l *License) ParseFeatures() {
	switch l.PlanKey {
	case Pro:
		l.FeatureSet = ProPlan
	case Enterprise:
		l.FeatureSet = EnterprisePlan
	default:
		l.FeatureSet = BasicPlan
	}
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
	ID   string                 `json:"id"`
	Key  string                 `json:"key"`
	Data map[string]interface{} `json:"data"`
}
type LicenseV3 struct {
	ID         string                 `json:"id"`
	Key        string                 `json:"key"`
	Data       map[string]interface{} `json:"data"`
	Plan       Plan                   `json:"plan"`
	Features   basemodel.FeatureSet   `json:"features"`
	IsCurrent  bool                   `json:"isCurrent"`
	ValidFrom  int64                  `json:"validFrom"`
	ValidUntil int64                  `json:"validUntil"`
}

func NewLicenseV3(data map[string]interface{}) (*LicenseV3, error) {
	var licenseID, licenseKey string
	var validFrom, validUntil int64
	var licenseData = data
	var features basemodel.FeatureSet
	plan := new(Plan)

	// extract id from data
	if _licenseId, ok := data["id"]; ok {
		if licenseId, ok := _licenseId.(string); ok {
			licenseID = licenseId
		} else {
			return nil, errors.New("license id is not a valid string!")
		}
		// if id is present then delete id from licenseData field
		delete(licenseData, "id")
	} else {
		return nil, errors.New("license id is missing!")
	}

	// extract key from data
	if _licenseKey, ok := data["key"]; ok {
		if licensekey, ok := _licenseKey.(string); ok {
			licenseKey = licensekey
		} else {
			return nil, errors.New("license key is not a valid string!")
		}
		// if key is present then delete id from licenseData field
		delete(licenseData, "key")
	} else {
		return nil, errors.New("license key is missing!")
	}

	if _plan, ok := licenseData["plan"]; ok {
		if parsedPlan, ok := _plan.(map[string]interface{}); ok {
			if planName, ok := parsedPlan["name"]; ok {
				if pName, ok := planName.(string); ok {
					plan.Name = pName
				}
			}
		}
	}
	// if unable to parse the plan then default it to basic!
	if plan.Name == "" {
		plan.Name = PlanNameBasic
	}

	featuresFromZeus := new(basemodel.FeatureSet)
	if features, ok := licenseData["features"]; ok {
		if val, ok := features.(basemodel.FeatureSet); ok {
			featuresFromZeus = &val
		}
	}
	features = append(features, *featuresFromZeus...)

	switch plan.Name {
	case PlanNameTeams:
		features = append(features, ProPlan...)
	case PlanNameEnterprise:
		features = append(features, EnterprisePlan...)
	case PlanNameBasic:
		features = append(features, BasicPlan...)
	default:
		features = append(features, BasicPlan...)
	}

	if _value, ok := licenseData["valid_from"]; ok {
		val, ok := _value.(int64)
		if ok {
			validFrom = val
		} else {
			floatVal, ok := _value.(float64)
			if !ok || floatVal != float64(int64(floatVal)) {
				// if the validFrom is float value default it to 0
				validFrom = 0
			} else {
				validFrom = int64(floatVal)
			}

		}
	}

	if _value, ok := licenseData["valid_until"]; ok {
		val, ok := _value.(int64)
		if ok {
			validUntil = val
		} else {
			floatVal, ok := _value.(float64)
			if !ok || floatVal != float64(int64(floatVal)) {
				// if the validFrom is float value default it to -1
				validUntil = -1
			}
			validUntil = int64(floatVal)
		}
	}

	return &LicenseV3{
		ID:         licenseID,
		Key:        licenseKey,
		Data:       licenseData,
		Plan:       *plan,
		Features:   features,
		ValidFrom:  validFrom,
		ValidUntil: validUntil,
	}, nil

}

func NewLicenseV3WithIDAndKey(id string, key string, data map[string]interface{}) (*LicenseV3, error) {
	licenseDataWithIdAndKey := data
	licenseDataWithIdAndKey["id"] = id
	licenseDataWithIdAndKey["key"] = key
	return NewLicenseV3(licenseDataWithIdAndKey)
}
