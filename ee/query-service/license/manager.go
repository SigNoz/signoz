package license

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/jmoiron/sqlx"

	"sync"

	"go.signoz.io/signoz/pkg/query-service/auth"
	baseconstants "go.signoz.io/signoz/pkg/query-service/constants"

	validate "go.signoz.io/signoz/ee/query-service/integrations/signozio"
	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.uber.org/zap"
)

var LM *Manager

// validate and update license every 24 hours
var validationFrequency = 24 * 60 * time.Minute

type Manager struct {
	repo  *Repo
	mutex sync.Mutex

	validatorRunning bool

	// end the license validation, this is important to gracefully
	// stopping validation and protect in-consistent updates
	done chan struct{}

	// terminated waits for the validate go routine to end
	terminated chan struct{}

	// last time the license was validated
	lastValidated int64

	// keep track of validation failure attempts
	failedAttempts uint64

	// keep track of active license and features
	activeLicense  *model.License
	activeFeatures basemodel.FeatureSet
}

func StartManager(dbType string, db *sqlx.DB, features ...basemodel.Feature) (*Manager, error) {
	if LM != nil {
		return LM, nil
	}

	repo := NewLicenseRepo(db)
	err := repo.InitDB(dbType)

	if err != nil {
		return nil, fmt.Errorf("failed to initiate license repo: %v", err)
	}

	m := &Manager{
		repo: &repo,
	}

	if err := m.start(features...); err != nil {
		return m, err
	}
	LM = m
	return m, nil
}

// start loads active license in memory and initiates validator
func (lm *Manager) start(features ...basemodel.Feature) error {
	err := lm.LoadActiveLicense(features...)

	return err
}

func (lm *Manager) Stop() {
	close(lm.done)
	<-lm.terminated
}

func (lm *Manager) SetActive(l *model.License, features ...basemodel.Feature) {
	lm.mutex.Lock()
	defer lm.mutex.Unlock()

	if l == nil {
		return
	}

	lm.activeLicense = l
	lm.activeFeatures = append(l.FeatureSet, features...)
	// set default features
	setDefaultFeatures(lm)

	err := lm.InitFeatures(lm.activeFeatures)
	if err != nil {
		zap.L().Panic("Couldn't activate features", zap.Error(err))
	}
	if !lm.validatorRunning {
		// we want to make sure only one validator runs,
		// we already have lock() so good to go
		lm.validatorRunning = true
		go lm.Validator(context.Background())
	}

}

func setDefaultFeatures(lm *Manager) {
	lm.activeFeatures = append(lm.activeFeatures, baseconstants.DEFAULT_FEATURE_SET...)
}

// LoadActiveLicense loads the most recent active license
func (lm *Manager) LoadActiveLicense(features ...basemodel.Feature) error {
	active, err := lm.repo.GetActiveLicense(context.Background())
	if err != nil {
		return err
	}
	if active != nil {
		lm.SetActive(active, features...)
	} else {
		zap.L().Info("No active license found, defaulting to basic plan")
		// if no active license is found, we default to basic(free) plan with all default features
		lm.activeFeatures = model.BasicPlan
		setDefaultFeatures(lm)
		err := lm.InitFeatures(lm.activeFeatures)
		if err != nil {
			zap.L().Error("Couldn't initialize features", zap.Error(err))
			return err
		}
	}

	return nil
}

func (lm *Manager) GetLicenses(ctx context.Context) (response []model.License, apiError *model.ApiError) {

	licenses, err := lm.repo.GetLicenses(ctx)
	if err != nil {
		return nil, model.InternalError(err)
	}

	for _, l := range licenses {
		l.ParsePlan()

		if lm.activeLicense != nil && l.Key == lm.activeLicense.Key {
			l.IsCurrent = true
		}

		if l.ValidUntil == -1 {
			// for subscriptions, there is no end-date as such
			// but for showing user some validity we default one year timespan
			l.ValidUntil = l.ValidFrom + 31556926
		}

		response = append(response, l)
	}

	return
}

// Validator validates license after an epoch of time
func (lm *Manager) Validator(ctx context.Context) {
	defer close(lm.terminated)
	tick := time.NewTicker(validationFrequency)
	defer tick.Stop()

	lm.Validate(ctx)

	for {
		select {
		case <-lm.done:
			return
		default:
			select {
			case <-lm.done:
				return
			case <-tick.C:
				lm.Validate(ctx)
			}
		}

	}
}

// Validate validates the current active license
func (lm *Manager) Validate(ctx context.Context) (reterr error) {
	zap.L().Info("License validation started")
	if lm.activeLicense == nil {
		return nil
	}

	defer func() {
		lm.mutex.Lock()

		lm.lastValidated = time.Now().Unix()
		if reterr != nil {
			zap.L().Error("License validation completed with error", zap.Error(reterr))
			atomic.AddUint64(&lm.failedAttempts, 1)
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_LICENSE_CHECK_FAILED,
				map[string]interface{}{"err": reterr.Error()}, "", true, false)
		} else {
			zap.L().Info("License validation completed with no errors")
		}

		lm.mutex.Unlock()
	}()

	response, apiError := validate.ValidateLicense(lm.activeLicense.ActivationId)
	if apiError != nil {
		zap.L().Error("failed to validate license", zap.Error(apiError.Err))
		return apiError.Err
	}

	if response.PlanDetails == lm.activeLicense.PlanDetails {
		// license plan hasnt changed, nothing to do
		return nil
	}

	if response.PlanDetails != "" {

		// copy and replace the active license record
		l := model.License{
			Key:               lm.activeLicense.Key,
			CreatedAt:         lm.activeLicense.CreatedAt,
			PlanDetails:       response.PlanDetails,
			ValidationMessage: lm.activeLicense.ValidationMessage,
			ActivationId:      lm.activeLicense.ActivationId,
		}

		if err := l.ParsePlan(); err != nil {
			zap.L().Error("failed to parse updated license", zap.Error(err))
			return err
		}

		// updated plan is parsable, check if plan has changed
		if lm.activeLicense.PlanDetails != response.PlanDetails {
			err := lm.repo.UpdatePlanDetails(ctx, lm.activeLicense.Key, response.PlanDetails)
			if err != nil {
				// unexpected db write issue but we can let the user continue
				// and wait for update to work in next cycle.
				zap.L().Error("failed to validate license", zap.Error(err))
			}
		}

		// activate the update license plan
		lm.SetActive(&l)
	}

	return nil
}

// Activate activates a license key with signoz server
func (lm *Manager) Activate(ctx context.Context, key string) (licenseResponse *model.License, errResponse *model.ApiError) {
	defer func() {
		if errResponse != nil {
			userEmail, err := auth.GetEmailFromJwt(ctx)
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_LICENSE_ACT_FAILED,
					map[string]interface{}{"err": errResponse.Err.Error()}, userEmail, true, false)
			}
		}
	}()

	response, apiError := validate.ActivateLicense(key, "")
	if apiError != nil {
		zap.L().Error("failed to activate license", zap.Error(apiError.Err))
		return nil, apiError
	}

	l := &model.License{
		Key:          key,
		ActivationId: response.ActivationId,
		PlanDetails:  response.PlanDetails,
	}

	// parse validity and features from the plan details
	err := l.ParsePlan()

	if err != nil {
		zap.L().Error("failed to activate license", zap.Error(err))
		return nil, model.InternalError(err)
	}

	// store the license before activating it
	err = lm.repo.InsertLicense(ctx, l)
	if err != nil {
		zap.L().Error("failed to activate license", zap.Error(err))
		return nil, model.InternalError(err)
	}

	// license is valid, activate it
	lm.SetActive(l)
	return l, nil
}

// CheckFeature will be internally used by backend routines
// for feature gating
func (lm *Manager) CheckFeature(featureKey string) error {
	feature, err := lm.repo.GetFeature(featureKey)
	if err != nil {
		return err
	}
	if feature.Active {
		return nil
	}
	return basemodel.ErrFeatureUnavailable{Key: featureKey}
}

// GetFeatureFlags returns current active features
func (lm *Manager) GetFeatureFlags() (basemodel.FeatureSet, error) {
	return lm.repo.GetAllFeatures()
}

func (lm *Manager) InitFeatures(features basemodel.FeatureSet) error {
	return lm.repo.InitFeatures(features)
}

func (lm *Manager) UpdateFeatureFlag(feature basemodel.Feature) error {
	return lm.repo.UpdateFeature(feature)
}

func (lm *Manager) GetFeatureFlag(key string) (basemodel.Feature, error) {
	return lm.repo.GetFeature(key)
}

// GetRepo return the license repo
func (lm *Manager) GetRepo() *Repo {
	return lm.repo
}
