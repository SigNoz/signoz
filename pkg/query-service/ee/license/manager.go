package license

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/jmoiron/sqlx"

	"sync"

	validate "go.signoz.io/query-service/ee/integrations/signozio"
	"go.signoz.io/query-service/ee/model"
	basemodel "go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.uber.org/zap"
)

var LM *Manager

// validate license every 24 hours
var validationFrequency = 24 * 60 * time.Minute

type Manager struct {
	repo  *Repo
	mutex sync.Mutex

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

func StartManager(dbType string, db *sqlx.DB) (*Manager, error) {

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

	if err := m.start(); err != nil {
		return m, err
	}
	LM = m
	return m, nil
}

// start loads active license in memory and initiates validator
func (lm *Manager) start() error {
	err := lm.LoadActiveLicense()
	if err == nil {
		go lm.Validator(context.Background())
	}
	return err
}

func (lm *Manager) Stop() {
	close(lm.done)
	<-lm.terminated
}

func (lm *Manager) SetActive(l *model.License) {
	lm.mutex.Lock()
	defer lm.mutex.Unlock()

	lm.activeLicense = l
	lm.activeFeatures = l.FeatureSet
}

func (lm *Manager) LoadActiveLicense() error {
	var err error
	active, err := lm.repo.GetActiveLicense(context.Background())
	if err != nil {
		return err
	}
	if active != nil {
		lm.SetActive(active)
	} else {
		zap.S().Info("No active license found.")
	}

	return nil
}

func (lm *Manager) GetLicenses(ctx context.Context) (response []*model.License, apiError *model.ApiError) {

	licenses, err := lm.repo.GetLicenses(ctx)
	if err != nil {
		return nil, model.InternalError(err)
	}

	for _, l := range licenses {
		l.ParsePlan()

		if l.Key == lm.activeLicense.Key {
			l.IsCurrent = true
		}

		response = append(response, &l)
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
	defer func() {
		lm.mutex.Lock()

		lm.lastValidated = time.Now().Unix()
		if reterr != nil {
			atomic.AddUint64(&lm.failedAttempts, 1)
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_LICENSE_CHECK_FAILED,
				map[string]interface{}{"err": reterr.Error()})
		}

		lm.mutex.Unlock()
	}()

	response, apiError := validate.ValidateLicense(lm.activeLicense.ActivationId)
	if apiError != nil {
		zap.S().Errorf("failed to validate license", apiError)
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
			zap.S().Errorf("failed to parse updated license", zap.Error(err))
			return err
		}

		// updated plan is parsable, check if plan has changed
		if lm.activeLicense.PlanDetails != response.PlanDetails {
			err := lm.repo.UpdatePlanDetails(ctx, lm.activeLicense.Key, response.PlanDetails)
			if err != nil {
				// unexpected db write issue but we can let the user continue
				// and wait for update to work in next cycle.
				zap.S().Errorf("failed to validate license", zap.Error(err))
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
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_LICENSE_ACT_FAILED,
				map[string]interface{}{"err": errResponse.Err.Error()})
		}
	}()
	response, apiError := validate.ActivateLicense(key, "")
	if apiError != nil {
		zap.S().Errorf("failed to activate license", zap.Error(apiError.Err))
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
		zap.S().Errorf("failed to activate license", zap.Error(err))
		return nil, model.BadRequest(err)
	}

	// store the license before activating it
	err = lm.repo.InsertLicense(ctx, l)
	if err != nil {
		zap.S().Errorf("failed to activate license", zap.Error(err))
		return nil, model.InternalError(err)
	}

	// license is valid, activate it
	lm.SetActive(l)
	return l, nil
}

// CheckFeature will be internally used by backend routines
// for feature gating
func (lm *Manager) CheckFeature(featureKey string) error {
	if _, ok := lm.activeFeatures[featureKey]; ok {
		return nil
	}
	return fmt.Errorf("feature unavailable")
}

// GetFeatureFlags returns current active features
func (lm *Manager) GetFeatureFlags() basemodel.FeatureSet {
	return lm.activeFeatures
}
