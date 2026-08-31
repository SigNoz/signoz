package licensetypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeCloudLicenseOperationUnsupported = errors.MustNewCode("cloud_license_operation_unsupported")
)

type StorableLicense struct {
	bun.BaseModel `bun:"table:license"`

	types.Identifiable
	types.TimeAuditable
	Key             string         `bun:"key,type:text,notnull,unique"`
	Data            map[string]any `bun:"data,type:text"`
	LastValidatedAt time.Time      `bun:"last_validated_at,notnull"`
	OrgID           valuer.UUID    `bun:"org_id,type:text,notnull" json:"orgId"`
}

// this data excludes ID and Key.
type License struct {
	ID              valuer.UUID
	Key             string
	Data            map[string]interface{}
	Plan            LicensePlan
	EventQueue      LicenseEventQueue
	Features        []*Feature
	Status          valuer.String
	State           valuer.String
	Platform        valuer.String
	FreeUntil       time.Time
	ValidFrom       int64
	ValidUntil      int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
	LastValidatedAt time.Time
	OrganizationID  valuer.UUID
}

type LicensePlan struct {
	ID          valuer.UUID   `json:"id" required:"true"`
	Name        valuer.String `json:"name" required:"true"`
	Description string        `json:"description" required:"true"`
	IsActive    bool          `json:"isActive" required:"true"`
	CreatedAt   time.Time     `json:"createdAt" required:"true"`
	UpdatedAt   time.Time     `json:"updatedAt" required:"true"`
}

type LicenseEventQueue struct {
	Event       valuer.String `json:"event" required:"true"`
	Status      valuer.String `json:"status" required:"true"`
	ScheduledAt time.Time     `json:"scheduledAt" required:"true"`
	CreatedAt   time.Time     `json:"createdAt" required:"true"`
	UpdatedAt   time.Time     `json:"updatedAt" required:"true"`
}

type GettableLicense struct {
	ID         valuer.UUID       `json:"id" required:"true"`
	ValidFrom  int64             `json:"validFrom" required:"true"`
	ValidUntil int64             `json:"validUntil" required:"true"`
	Status     valuer.String     `json:"status" required:"true"`
	State      valuer.String     `json:"state" required:"true"`
	Platform   valuer.String     `json:"platform" required:"true"`
	FreeUntil  time.Time         `json:"freeUntil" required:"true"`
	CreatedAt  time.Time         `json:"createdAt" required:"true"`
	UpdatedAt  time.Time         `json:"updatedAt" required:"true"`
	Plan       LicensePlan       `json:"plan" required:"true"`
	Features   []*Feature        `json:"features" required:"true"`
	EventQueue LicenseEventQueue `json:"eventQueue" required:"true"`
}

type GettableLicenseWithKey struct {
	GettableLicense
	Key string `json:"key" required:"true"`
}

type GettableActiveLicense struct {
	GettableLicense
}

type PostableLicense struct {
	Key string `json:"key"`
}

func NewStorableLicenseFromLicense(license *License) *StorableLicense {
	return &StorableLicense{
		Identifiable: types.Identifiable{
			ID: license.ID,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: license.CreatedAt,
			UpdatedAt: license.UpdatedAt,
		},
		Key:             license.Key,
		Data:            license.Data,
		LastValidatedAt: license.LastValidatedAt,
		OrgID:           license.OrganizationID,
	}
}

func GetActiveLicenseFromStorableLicenses(storableLicenses []*StorableLicense, organizationID valuer.UUID) (*License, error) {
	var activeLicense *License
	for _, storableLicense := range storableLicenses {
		license, err := NewLicenseFromStorableLicense(storableLicense)
		if err != nil {
			return nil, err
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

func NewLicense(zeusLicense *zeustypes.License, organizationID valuer.UUID) (*License, error) {
	if zeusLicense.ID.IsZero() {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license id is missing")
	}

	if zeusLicense.Key == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license key is missing")
	}

	planName, status, err := newPlanNameAndStatusFromZeusLicense(zeusLicense)
	if err != nil {
		return nil, err
	}

	features := newMergedFeatures(planName, zeusLicense.Features)

	data, err := newDataFromZeusLicense(zeusLicense, features)
	if err != nil {
		return nil, err
	}

	return &License{
		ID:              zeusLicense.ID,
		Key:             zeusLicense.Key,
		Data:            data,
		Plan:            newLicensePlanFromZeusLicense(zeusLicense, planName),
		EventQueue:      newLicenseEventQueueFromZeusLicense(zeusLicense),
		Features:        features,
		ValidFrom:       zeusLicense.ValidFrom,
		ValidUntil:      zeusLicense.ValidUntil,
		Status:          status,
		State:           valuer.NewString(zeusLicense.State),
		Platform:        valuer.NewString(zeusLicense.Platform),
		FreeUntil:       zeusLicense.FreeUntil,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		LastValidatedAt: time.Now(),
		OrganizationID:  organizationID,
	}, nil
}

func NewLicenseFromStorableLicense(storableLicense *StorableLicense) (*License, error) {
	zeusLicense, err := NewZeusLicenseFromData(storableLicense.Data)
	if err != nil {
		return nil, err
	}

	planName, status, err := newPlanNameAndStatusFromZeusLicense(zeusLicense)
	if err != nil {
		return nil, err
	}

	features := newMergedFeatures(planName, zeusLicense.Features)
	storableLicense.Data["features"] = features

	return &License{
		ID:              storableLicense.ID,
		Key:             storableLicense.Key,
		Data:            storableLicense.Data,
		Plan:            newLicensePlanFromZeusLicense(zeusLicense, planName),
		EventQueue:      newLicenseEventQueueFromZeusLicense(zeusLicense),
		Features:        features,
		ValidFrom:       zeusLicense.ValidFrom,
		ValidUntil:      zeusLicense.ValidUntil,
		Status:          status,
		State:           valuer.NewString(zeusLicense.State),
		Platform:        valuer.NewString(zeusLicense.Platform),
		FreeUntil:       zeusLicense.FreeUntil,
		CreatedAt:       storableLicense.CreatedAt,
		UpdatedAt:       storableLicense.UpdatedAt,
		LastValidatedAt: storableLicense.LastValidatedAt,
		OrganizationID:  storableLicense.OrgID,
	}, nil
}

func NewZeusLicenseFromData(data map[string]any) (*zeustypes.License, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal license data")
	}

	zeusLicense := new(zeustypes.License)
	if err := json.Unmarshal(dataBytes, zeusLicense); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal license data")
	}

	return zeusLicense, nil
}

// ErrIfCloud returns an error if the license is managed by SigNoz Cloud. The
// caller should enrich the error with the specific operation using errors.WithAdditionalf.
func (license *License) ErrIfCloud() error {
	if license.Platform == LicensePlatformCloud {
		return errors.New(errors.TypeInvalidInput, ErrCodeCloudLicenseOperationUnsupported, "this operation is not supported for licenses managed by SigNoz Cloud")
	}
	return nil
}

func NewStatsFromLicense(license *License) map[string]any {
	return map[string]any{
		"license.id":              license.ID.StringValue(),
		"license.plan.name":       license.Plan.Name.StringValue(),
		"license.state.name":      license.State.StringValue(),
		"license.free_until.time": license.FreeUntil.UTC(),
	}
}

func (license *License) UpdateFeatures(features []*Feature) {
	license.Features = features
}

func (license *License) Update(zeusLicense *zeustypes.License) error {
	updatedLicense, err := NewLicense(zeusLicense, license.OrganizationID)
	if err != nil {
		return err
	}

	currentTime := time.Now()
	license.Data = updatedLicense.Data
	license.Features = updatedLicense.Features
	license.ID = updatedLicense.ID
	license.Key = updatedLicense.Key
	license.Plan = updatedLicense.Plan
	license.EventQueue = updatedLicense.EventQueue
	license.Status = updatedLicense.Status
	license.State = updatedLicense.State
	license.Platform = updatedLicense.Platform
	license.ValidFrom = updatedLicense.ValidFrom
	license.ValidUntil = updatedLicense.ValidUntil
	license.UpdatedAt = currentTime
	license.LastValidatedAt = currentTime

	return nil
}

func NewGettableLicense(license *License) *GettableLicense {
	return &GettableLicense{
		ID:         license.ID,
		ValidFrom:  license.ValidFrom,
		ValidUntil: license.ValidUntil,
		Status:     license.Status,
		State:      license.State,
		Platform:   license.Platform,
		FreeUntil:  license.FreeUntil,
		CreatedAt:  license.CreatedAt,
		UpdatedAt:  license.UpdatedAt,
		Plan:       license.Plan,
		Features:   license.Features,
		EventQueue: license.EventQueue,
	}
}

func NewGettableLicenseWithKey(license *License) *GettableLicenseWithKey {
	return &GettableLicenseWithKey{
		GettableLicense: *NewGettableLicense(license),
		Key:             license.Key,
	}
}

func NewGettableActiveLicense(license *License) *GettableActiveLicense {
	return &GettableActiveLicense{
		GettableLicense: *NewGettableLicense(license),
	}
}

func (p *PostableLicense) UnmarshalJSON(data []byte) error {
	var postableLicense struct {
		Key string `json:"key"`
	}

	err := json.Unmarshal(data, &postableLicense)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal payload")
	}

	if postableLicense.Key == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license key cannot be empty")
	}

	p.Key = postableLicense.Key
	return nil
}

type Store interface {
	Create(context.Context, *StorableLicense) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableLicense, error)
	GetAll(context.Context, valuer.UUID) ([]*StorableLicense, error)
	Update(context.Context, valuer.UUID, *StorableLicense) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}

func newPlanNameAndStatusFromZeusLicense(zeusLicense *zeustypes.License) (valuer.String, valuer.String, error) {
	if zeusLicense.Status == "" {
		return valuer.String{}, valuer.String{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license status is missing")
	}

	if zeusLicense.Plan.Name == "" {
		return valuer.String{}, valuer.String{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license plan name is missing")
	}

	status := valuer.NewString(zeusLicense.Status)
	planName := valuer.NewString(zeusLicense.Plan.Name)
	// if license status is invalid then default it to basic
	if status == LicenseStatusInvalid {
		planName = PlanNameBasic
	}

	return planName, status, nil
}

func newLicensePlanFromZeusLicense(zeusLicense *zeustypes.License, planName valuer.String) LicensePlan {
	return LicensePlan{
		ID:          zeusLicense.Plan.ID,
		Name:        planName,
		Description: zeusLicense.Plan.Description,
		IsActive:    zeusLicense.Plan.IsActive,
		CreatedAt:   zeusLicense.Plan.CreatedAt,
		UpdatedAt:   zeusLicense.Plan.UpdatedAt,
	}
}

func newLicenseEventQueueFromZeusLicense(zeusLicense *zeustypes.License) LicenseEventQueue {
	return LicenseEventQueue{
		Event:       valuer.NewString(zeusLicense.EventQueue.Event),
		Status:      valuer.NewString(zeusLicense.EventQueue.Status),
		ScheduledAt: zeusLicense.EventQueue.ScheduledAt,
		CreatedAt:   zeusLicense.EventQueue.CreatedAt,
		UpdatedAt:   zeusLicense.EventQueue.UpdatedAt,
	}
}

func newMergedFeatures(planName valuer.String, zeusFeatures []zeustypes.LicenseFeature) []*Feature {
	features := make([]*Feature, 0)
	switch planName {
	case PlanNameEnterprise:
		features = append(features, EnterprisePlan...)
	default:
		features = append(features, BasicPlan...)
	}

	for _, zeusFeature := range zeusFeatures {
		feature := &Feature{
			Name:       valuer.NewString(zeusFeature.Name),
			Active:     zeusFeature.Active,
			Usage:      zeusFeature.Usage,
			UsageLimit: zeusFeature.UsageLimit,
			Route:      zeusFeature.Route,
		}

		exists := false
		for i, existingFeature := range features {
			if existingFeature.Name == feature.Name {
				features[i] = feature
				exists = true
				break
			}
		}
		if !exists {
			features = append(features, feature)
		}
	}

	return features
}

func newDataFromZeusLicense(zeusLicense *zeustypes.License, features []*Feature) (map[string]any, error) {
	dataBytes, err := json.Marshal(zeusLicense)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal license data")
	}

	data := map[string]any{}
	if err := json.Unmarshal(dataBytes, &data); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal license data")
	}

	delete(data, "id")
	delete(data, "key")
	data["features"] = features

	return data, nil
}
