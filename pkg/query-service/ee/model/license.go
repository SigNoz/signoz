package model

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
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
	Status     string `json:"status"`
}

func (l *License) ParsePlan() error {
	l.LicensePlan = LicensePlan{}

	planData, err := base64.StdEncoding.DecodeString(l.PlanDetails)
	if err != nil {
		return err
	}
	fmt.Println("planData:", string(planData))

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
	case Basic:
		l.FeatureSet = basemodel.BasicPlan
	case Pro:
		l.FeatureSet = ProPlan
	case Enterprise:
		l.FeatureSet = EnterprisePlan
	}
}
