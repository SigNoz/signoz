package license

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"

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
	activeLicense   *model.License
	activeLicenseV3 *model.LicenseV3
	activeFeatures  basemodel.FeatureSet
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
	return lm.LoadActiveLicenseV3(features...)
}

func (lm *Manager) Stop() {
	close(lm.done)
	<-lm.terminated
}

func (lm *Manager) SetActiveV3(l *model.LicenseV3, features ...basemodel.Feature) {
	lm.mutex.Lock()
	defer lm.mutex.Unlock()

	if l == nil {
		return
	}

	lm.activeLicenseV3 = l
	lm.activeFeatures = append(l.Features, features...)
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
		go lm.ValidatorV3(context.Background())
	}

}

func setDefaultFeatures(lm *Manager) {
	lm.activeFeatures = append(lm.activeFeatures, baseconstants.DEFAULT_FEATURE_SET...)
}

func (lm *Manager) LoadActiveLicenseV3(features ...basemodel.Feature) error {
	active, err := lm.repo.GetActiveLicenseV3(context.Background())
	if err != nil {
		return err
	}
	if active != nil {
		lm.SetActiveV3(active, features...)
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

func (lm *Manager) GetLicensesV3(ctx context.Context) (response []*model.LicenseV3, apiError *model.ApiError) {

	licenses, err := lm.repo.GetLicensesV3(ctx)
	if err != nil {
		return nil, model.InternalError(err)
	}

	for _, l := range licenses {
		if lm.activeLicenseV3 != nil && l.Key == lm.activeLicenseV3.Key {
			l.IsCurrent = true
		}
		if l.ValidUntil == -1 {
			// for subscriptions, there is no end-date as such
			// but for showing user some validity we default one year timespan
			l.ValidUntil = l.ValidFrom + 31556926
		}
		response = append(response, l)
	}

	return response, nil
}

// Validator validates license after an epoch of time
func (lm *Manager) ValidatorV3(ctx context.Context) {
	zap.L().Info("ValidatorV3 started!")
	defer close(lm.terminated)
	tick := time.NewTicker(validationFrequency)
	defer tick.Stop()

	lm.ValidateV3(ctx)

	for {
		select {
		case <-lm.done:
			return
		default:
			select {
			case <-lm.done:
				return
			case <-tick.C:
				lm.ValidateV3(ctx)
			}
		}

	}
}

func (lm *Manager) RefreshLicense(ctx context.Context) *model.ApiError {

	license, apiError := validate.ValidateLicenseV3(lm.activeLicenseV3.Key)
	if apiError != nil {
		zap.L().Error("failed to validate license", zap.Error(apiError.Err))
		return apiError
	}

	err := lm.repo.UpdateLicenseV3(ctx, license)
	if err != nil {
		return model.BadRequest(errors.Wrap(err, "failed to update the new license"))
	}
	lm.SetActiveV3(license)

	return nil
}

func (lm *Manager) ValidateV3(ctx context.Context) (reterr error) {
	zap.L().Info("License validation started")
	if lm.activeLicenseV3 == nil {
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

	err := lm.RefreshLicense(ctx)

	if err != nil {
		return err
	}
	return nil
}

func (lm *Manager) ActivateV3(ctx context.Context, licenseKey string) (licenseResponse *model.LicenseV3, errResponse *model.ApiError) {
	defer func() {
		if errResponse != nil {
			userEmail, err := auth.GetEmailFromJwt(ctx)
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_LICENSE_ACT_FAILED,
					map[string]interface{}{"err": errResponse.Err.Error()}, userEmail, true, false)
			}
		}
	}()

	license, apiError := validate.ValidateLicenseV3(licenseKey)
	if apiError != nil {
		zap.L().Error("failed to get the license", zap.Error(apiError.Err))
		return nil, apiError
	}

	// insert the new license to the sqlite db
	err := lm.repo.InsertLicenseV3(ctx, license)
	if err != nil {
		zap.L().Error("failed to activate license", zap.Error(err))
		return nil, err
	}

	// license is valid, activate it
	lm.SetActiveV3(license)
	return license, nil
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
