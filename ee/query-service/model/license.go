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
type LicenseV3 struct {
	ID        string                 `json:"id"`
	Key       string                 `json:"key"`
	Data      map[string]interface{} `json:"data"`
	Features  basemodel.FeatureSet   `json:"features"`
	IsCurrent bool                   `json:"isCurrent"`
}

func NewLicenseV3(data map[string]interface{}) *LicenseV3 {
	var licenseID, licenseKey string
	var licenseData = data

	// extract id from data
	if _licenseId, ok := data["id"]; ok {
		if licenseId, ok := _licenseId.(string); ok {
			licenseID = licenseId
		}
		// if id is present then delete id from licenseData field
		delete(licenseData, "id")
	}

	// extract key from data
	if _licenseKey, ok := data["key"]; ok {
		if licensekey, ok := _licenseKey.(string); ok {
			licenseKey = licensekey
		}
		// if key is present then delete id from licenseData field
		delete(licenseData, "key")
	}

	l := &LicenseV3{
		ID:   licenseID,
		Key:  licenseKey,
		Data: licenseData,
	}
	// parse the features here!
	l.ParseFeaturesV3()

	return l

}

func (l *LicenseV3) ParseFeaturesV3() {
	var planKey string
	if _plan, ok := l.Data["plan"]; ok {
		if plan, ok := _plan.(map[string]interface{}); ok {
			if _planName, ok := plan["name"]; ok {
				if planName, ok := _planName.(string); ok {
					planKey = planName
				}

			}
		}

	}

	featuresFromZeus := new(basemodel.FeatureSet)
	if features, ok := l.Data["features"]; ok {
		if val, ok := features.(basemodel.FeatureSet); ok {
			featuresFromZeus = &val
		}
	}

	l.Features = append(l.Features, *featuresFromZeus...)

	switch planKey {
	case PlanNameTeams:
		l.Features = append(l.Features, ProPlan...)
	case PlanNameEnterprise:
		l.Features = append(l.Features, EnterprisePlan...)
	default:
		l.Features = append(l.Features, BasicPlan...)
	}
}
