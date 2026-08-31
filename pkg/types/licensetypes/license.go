package licensetypes

import (
	"context"
	"encoding/json"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
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

type DeprecatedGettableLicense map[string]any

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

func extractKeyFromMapStringInterface[T any](data map[string]interface{}, key string) (T, error) {
	var zeroValue T
	if val, ok := data[key]; ok {
		if value, ok := val.(T); ok {
			return value, nil
		}
		return zeroValue, errors.NewInvalidInputf(errors.CodeInvalidInput, "%s key is not a valid %s", key, reflect.TypeOf(zeroValue))
	}
	return zeroValue, errors.NewInvalidInputf(errors.CodeInvalidInput, "%s key is missing", key)
}

func NewLicense(data []byte, organizationID valuer.UUID) (*License, error) {
	licenseData := map[string]any{}
	err := json.Unmarshal(data, &licenseData)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal license data")
	}

	var features []*Feature

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
	statusStr, err := extractKeyFromMapStringInterface[string](licenseData, "status")
	if err != nil {
		return nil, err
	}
	status := valuer.NewString(statusStr)

	planMap, err := extractKeyFromMapStringInterface[map[string]any](licenseData, "plan")
	if err != nil {
		return nil, err
	}

	planNameStr, err := extractKeyFromMapStringInterface[string](planMap, "name")
	if err != nil {
		return nil, err
	}
	planName := valuer.NewString(planNameStr)
	// if license status is invalid then default it to basic
	if status == LicenseStatusInvalid {
		planName = PlanNameBasic
	}

	planData, err := json.Marshal(planMap)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal plan data")
	}

	zeusPlan := zeustypes.LicensePlan{}
	if err := json.Unmarshal(planData, &zeusPlan); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal plan data")
	}

	plan := LicensePlan{
		ID:          zeusPlan.ID,
		Name:        planName,
		Description: zeusPlan.Description,
		IsActive:    zeusPlan.IsActive,
		CreatedAt:   zeusPlan.CreatedAt,
		UpdatedAt:   zeusPlan.UpdatedAt,
	}

	eventQueue := LicenseEventQueue{}
	if _eventQueue, ok := licenseData["event_queue"]; ok {
		eventQueueData, err := json.Marshal(_eventQueue)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal event queue data")
		}

		zeusEventQueue := zeustypes.LicenseEventQueue{}
		if err := json.Unmarshal(eventQueueData, &zeusEventQueue); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal event queue data")
		}

		eventQueue = LicenseEventQueue{
			Event:       valuer.NewString(zeusEventQueue.Event),
			Status:      valuer.NewString(zeusEventQueue.Status),
			ScheduledAt: zeusEventQueue.ScheduledAt,
			CreatedAt:   zeusEventQueue.CreatedAt,
			UpdatedAt:   zeusEventQueue.UpdatedAt,
		}
	}

	state, err := extractKeyFromMapStringInterface[string](licenseData, "state")
	if err != nil {
		state = ""
	}

	platform, err := extractKeyFromMapStringInterface[string](licenseData, "platform")
	if err != nil {
		platform = ""
	}

	freeUntilStr, err := extractKeyFromMapStringInterface[string](licenseData, "free_until")
	if err != nil {
		freeUntilStr = ""
	}

	freeUntil, err := time.Parse(time.RFC3339, freeUntilStr)
	if err != nil {
		freeUntil = time.Time{}
	}

	featuresFromZeus := make([]*Feature, 0)
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
		Plan:            plan,
		EventQueue:      eventQueue,
		Features:        features,
		ValidFrom:       validFrom,
		ValidUntil:      validUntil,
		Status:          status,
		State:           valuer.NewString(state),
		Platform:        valuer.NewString(platform),
		FreeUntil:       freeUntil,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		LastValidatedAt: time.Now(),
		OrganizationID:  organizationID,
	}, nil

}

func NewLicenseFromStorableLicense(storableLicense *StorableLicense) (*License, error) {
	var features []*Feature
	// extract status from data
	statusStr, err := extractKeyFromMapStringInterface[string](storableLicense.Data, "status")
	if err != nil {
		return nil, err
	}
	status := valuer.NewString(statusStr)

	planMap, err := extractKeyFromMapStringInterface[map[string]any](storableLicense.Data, "plan")
	if err != nil {
		return nil, err
	}

	planNameStr, err := extractKeyFromMapStringInterface[string](planMap, "name")
	if err != nil {
		return nil, err
	}
	planName := valuer.NewString(planNameStr)
	// if license status is invalid then default it to basic
	if status == LicenseStatusInvalid {
		planName = PlanNameBasic
	}

	planData, err := json.Marshal(planMap)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal plan data")
	}

	zeusPlan := zeustypes.LicensePlan{}
	if err := json.Unmarshal(planData, &zeusPlan); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal plan data")
	}

	plan := LicensePlan{
		ID:          zeusPlan.ID,
		Name:        planName,
		Description: zeusPlan.Description,
		IsActive:    zeusPlan.IsActive,
		CreatedAt:   zeusPlan.CreatedAt,
		UpdatedAt:   zeusPlan.UpdatedAt,
	}

	eventQueue := LicenseEventQueue{}
	if _eventQueue, ok := storableLicense.Data["event_queue"]; ok {
		eventQueueData, err := json.Marshal(_eventQueue)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal event queue data")
		}

		zeusEventQueue := zeustypes.LicenseEventQueue{}
		if err := json.Unmarshal(eventQueueData, &zeusEventQueue); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal event queue data")
		}

		eventQueue = LicenseEventQueue{
			Event:       valuer.NewString(zeusEventQueue.Event),
			Status:      valuer.NewString(zeusEventQueue.Status),
			ScheduledAt: zeusEventQueue.ScheduledAt,
			CreatedAt:   zeusEventQueue.CreatedAt,
			UpdatedAt:   zeusEventQueue.UpdatedAt,
		}
	}

	featuresFromZeus := make([]*Feature, 0)
	if _features, ok := storableLicense.Data["features"]; ok {
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
	storableLicense.Data["features"] = features

	_validFrom, err := extractKeyFromMapStringInterface[float64](storableLicense.Data, "valid_from")
	if err != nil {
		_validFrom = 0
	}
	validFrom := int64(_validFrom)

	_validUntil, err := extractKeyFromMapStringInterface[float64](storableLicense.Data, "valid_until")
	if err != nil {
		_validUntil = 0
	}
	validUntil := int64(_validUntil)

	state, err := extractKeyFromMapStringInterface[string](storableLicense.Data, "state")
	if err != nil {
		state = ""
	}

	platform, err := extractKeyFromMapStringInterface[string](storableLicense.Data, "platform")
	if err != nil {
		platform = ""
	}

	freeUntilStr, err := extractKeyFromMapStringInterface[string](storableLicense.Data, "free_until")
	if err != nil {
		freeUntilStr = ""
	}

	freeUntil, err := time.Parse(time.RFC3339, freeUntilStr)
	if err != nil {
		freeUntil = time.Time{}
	}

	return &License{
		ID:              storableLicense.ID,
		Key:             storableLicense.Key,
		Data:            storableLicense.Data,
		Plan:            plan,
		EventQueue:      eventQueue,
		Features:        features,
		ValidFrom:       validFrom,
		ValidUntil:      validUntil,
		Status:          status,
		State:           valuer.NewString(state),
		Platform:        valuer.NewString(platform),
		FreeUntil:       freeUntil,
		CreatedAt:       storableLicense.CreatedAt,
		UpdatedAt:       storableLicense.UpdatedAt,
		LastValidatedAt: storableLicense.LastValidatedAt,
		OrganizationID:  storableLicense.OrgID,
	}, nil

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

func (license *License) Update(data []byte) error {
	updatedLicense, err := NewLicense(data, license.OrganizationID)
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

func NewDeprecatedGettableLicense(data map[string]any, key string) *DeprecatedGettableLicense {
	deprecatedGettableLicense := make(DeprecatedGettableLicense)
	for k, v := range data {
		deprecatedGettableLicense[k] = v
	}
	deprecatedGettableLicense["key"] = key
	return &deprecatedGettableLicense
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
