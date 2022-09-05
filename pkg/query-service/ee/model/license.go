package model

import (
	"encoding/json"
	"github.com/pkg/errors"
	basemodel "go.signoz.io/query-service/model"
	"time"
)

type License struct {
	ID           int       `json:"id" db:"id"`
	ActivationId string    `json:"activationId" db:"activationId"`
	Key          string    `json:"key" db:"key"`
	CreatedAt    time.Time `db:"created_at"`
	// PlanDetails contains the encrypted plan info
	PlanDetails string `json:"planDetails" db:"planDetails"`
	LicensePlan
	FeatureSet basemodel.FeatureSet
	// populated in case license has any errors
	ValidationMessage string `db:"validationMessage"`
}

type LicensePlan struct {
	PlanKey    string `json:"planKey"`
	ValidFrom  int64  `json:"ValidFrom"`
	ValidUntil int64  `json:"ValidUntil"`
}

func (l *License) ParsePlan() error {
	l.LicensePlan = LicensePlan{}
	err := json.Unmarshal([]byte(l.PlanDetails), &l.LicensePlan)
	l.ValidationMessage = "failed to parse plan from license"
	if err != nil {
		return errors.Wrap(err, "failed to parse plan from license")
	}
	l.ParseFeatures()
	return nil
}

func (l *License) ParseFeatures() {
	switch l.PlanKey {
	case "BasicPlan":
		l.FeatureSet = basemodel.BasicPlan
	case "ProPlan":
		l.FeatureSet = ProPlan
	case "EnterprisePlan":
		l.FeatureSet = EnterprisePlan
	}
}
