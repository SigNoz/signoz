package license

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/mattn/go-sqlite3"

	"go.signoz.io/signoz/ee/query-service/license/sqlite"
	"go.signoz.io/signoz/ee/query-service/model"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// Repo is license repo. stores license keys in a secured DB
type Repo struct {
	db            *sqlx.DB
	useLicensesV3 bool
}

// NewLicenseRepo initiates a new license repo
func NewLicenseRepo(db *sqlx.DB, useLicensesV3 bool) Repo {
	return Repo{
		db:            db,
		useLicensesV3: useLicensesV3,
	}
}

func (r *Repo) InitDB(engine string) error {
	switch engine {
	case "sqlite3", "sqlite":
		return sqlite.InitDB(r.db)
	default:
		return fmt.Errorf("unsupported db")
	}
}

func (r *Repo) GetLicenses(ctx context.Context) ([]model.License, error) {
	licenses := []model.License{}

	query := "SELECT key, activationId, planDetails, validationMessage FROM licenses"

	err := r.db.Select(&licenses, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get licenses from db: %v", err)
	}

	return licenses, nil
}

func (r *Repo) GetLicensesV3(ctx context.Context) ([]*model.LicenseV3, error) {
	licensesData := []model.LicenseDB{}
	licenseV3Data := []*model.LicenseV3{}

	query := "SELECT id,key,data FROM licenses_v3"

	err := r.db.Select(&licensesData, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get licenses from db: %v", err)
	}

	for _, l := range licensesData {
		var licenseData map[string]interface{}
		err := json.Unmarshal([]byte(l.Data), &licenseData)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal data into licenseData : %v", err)
		}

		license, err := model.NewLicenseV3WithIDAndKey(l.ID, l.Key, licenseData)
		if err != nil {
			return nil, fmt.Errorf("failed to get licenses v3 schema : %v", err)
		}
		licenseV3Data = append(licenseV3Data, license)
	}

	return licenseV3Data, nil
}

func (r *Repo) GetActiveLicenseV2(ctx context.Context) (*model.License, *basemodel.ApiError) {
	var err error
	licenses := []model.License{}

	query := "SELECT key, activationId, planDetails, validationMessage FROM licenses"

	err = r.db.Select(&licenses, query)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("failed to get active licenses from db: %v", err))
	}

	var active *model.License
	for _, l := range licenses {
		l.ParsePlan()
		if active == nil &&
			(l.ValidFrom != 0) &&
			(l.ValidUntil == -1 || l.ValidUntil > time.Now().Unix()) {
			active = &l
		}
		if active != nil &&
			l.ValidFrom > active.ValidFrom &&
			(l.ValidUntil == -1 || l.ValidUntil > time.Now().Unix()) {
			active = &l
		}
	}

	return active, nil
}

// GetActiveLicense fetches the latest active license from DB.
// If the license is not present, expect a nil license and a nil error in the output.
func (r *Repo) GetActiveLicense(ctx context.Context) (*model.License, *basemodel.ApiError) {
	if r.useLicensesV3 {
		zap.L().Info("Using licenses v3 for GetActiveLicense")
		activeLicenseV3, err := r.GetActiveLicenseV3(ctx)
		if err != nil {
			return nil, basemodel.InternalError(fmt.Errorf("failed to get active licenses from db: %v", err))
		}

		if activeLicenseV3 == nil {
			return nil, nil
		}
		activeLicenseV2 := model.ConvertLicenseV3ToLicenseV2(activeLicenseV3)
		return activeLicenseV2, nil

	}

	active, err := r.GetActiveLicenseV2(ctx)
	if err != nil {
		return nil, err
	}
	return active, nil
}

func (r *Repo) GetActiveLicenseV3(ctx context.Context) (*model.LicenseV3, error) {
	var err error
	licenses := []model.LicenseDB{}

	query := "SELECT id,key,data FROM licenses_v3"

	err = r.db.Select(&licenses, query)
	if err != nil {
		return nil, basemodel.InternalError(fmt.Errorf("failed to get active licenses from db: %v", err))
	}

	var active *model.LicenseV3
	for _, l := range licenses {
		var licenseData map[string]interface{}
		err := json.Unmarshal([]byte(l.Data), &licenseData)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal data into licenseData : %v", err)
		}

		license, err := model.NewLicenseV3WithIDAndKey(l.ID, l.Key, licenseData)
		if err != nil {
			return nil, fmt.Errorf("failed to get licenses v3 schema : %v", err)
		}

		if active == nil &&
			(license.ValidFrom != 0) &&
			(license.ValidUntil == -1 || license.ValidUntil > time.Now().Unix()) {
			active = license
		}
		if active != nil &&
			license.ValidFrom > active.ValidFrom &&
			(license.ValidUntil == -1 || license.ValidUntil > time.Now().Unix()) {
			active = license
		}
	}

	return active, nil
}

// InsertLicense inserts a new license in db
func (r *Repo) InsertLicense(ctx context.Context, l *model.License) error {

	if l.Key == "" {
		return fmt.Errorf("insert license failed: license key is required")
	}

	query := `INSERT INTO licenses 
						(key, planDetails, activationId, validationmessage) 
						VALUES ($1, $2, $3, $4)`

	_, err := r.db.ExecContext(ctx,
		query,
		l.Key,
		l.PlanDetails,
		l.ActivationId,
		l.ValidationMessage)

	if err != nil {
		zap.L().Error("error in inserting license data: ", zap.Error(err))
		return fmt.Errorf("failed to insert license in db: %v", err)
	}

	return nil
}

// UpdatePlanDetails writes new plan details to the db
func (r *Repo) UpdatePlanDetails(ctx context.Context,
	key,
	planDetails string) error {

	if key == "" {
		return fmt.Errorf("update plan details failed: license key is required")
	}

	query := `UPDATE licenses 
						SET planDetails = $1,
						updatedAt = $2
						WHERE key = $3`

	_, err := r.db.ExecContext(ctx, query, planDetails, time.Now(), key)

	if err != nil {
		zap.L().Error("error in updating license: ", zap.Error(err))
		return fmt.Errorf("failed to update license in db: %v", err)
	}

	return nil
}

func (r *Repo) CreateFeature(req *basemodel.Feature) *basemodel.ApiError {

	_, err := r.db.Exec(
		`INSERT INTO feature_status (name, active, usage, usage_limit, route)
		VALUES (?, ?, ?, ?, ?);`,
		req.Name, req.Active, req.Usage, req.UsageLimit, req.Route)
	if err != nil {
		return &basemodel.ApiError{Typ: basemodel.ErrorInternal, Err: err}
	}
	return nil
}

func (r *Repo) GetFeature(featureName string) (basemodel.Feature, error) {

	var feature basemodel.Feature

	err := r.db.Get(&feature,
		`SELECT * FROM feature_status WHERE name = ?;`, featureName)
	if err != nil {
		return feature, err
	}
	if feature.Name == "" {
		return feature, basemodel.ErrFeatureUnavailable{Key: featureName}
	}
	return feature, nil
}

func (r *Repo) GetAllFeatures() ([]basemodel.Feature, error) {

	var feature []basemodel.Feature

	err := r.db.Select(&feature,
		`SELECT * FROM feature_status;`)
	if err != nil {
		return feature, err
	}

	return feature, nil
}

func (r *Repo) UpdateFeature(req basemodel.Feature) error {

	_, err := r.db.Exec(
		`UPDATE feature_status SET active = ?, usage = ?, usage_limit = ?, route = ? WHERE name = ?;`,
		req.Active, req.Usage, req.UsageLimit, req.Route, req.Name)
	if err != nil {
		return err
	}
	return nil
}

func (r *Repo) InitFeatures(req basemodel.FeatureSet) error {
	// get a feature by name, if it doesn't exist, create it. If it does exist, update it.
	for _, feature := range req {
		currentFeature, err := r.GetFeature(feature.Name)
		if err != nil && err == sql.ErrNoRows {
			err := r.CreateFeature(&feature)
			if err != nil {
				return err
			}
			continue
		} else if err != nil {
			return err
		}
		feature.Usage = currentFeature.Usage
		if feature.Usage >= feature.UsageLimit && feature.UsageLimit != -1 {
			feature.Active = false
		}
		err = r.UpdateFeature(feature)
		if err != nil {
			return err
		}
	}
	return nil
}

// InsertLicenseV3 inserts a new license v3 in db
func (r *Repo) InsertLicenseV3(ctx context.Context, l *model.LicenseV3) *model.ApiError {

	query := `INSERT INTO licenses_v3 (id, key, data) VALUES ($1, $2, $3)`

	// licsense is the entity of zeus so putting the entire license here without defining schema
	licenseData, err := json.Marshal(l.Data)
	if err != nil {
		return &model.ApiError{Typ: basemodel.ErrorBadData, Err: err}
	}

	_, err = r.db.ExecContext(ctx,
		query,
		l.ID,
		l.Key,
		string(licenseData),
	)

	if err != nil {
		if sqliteErr, ok := err.(sqlite3.Error); ok {
			if sqliteErr.ExtendedCode == sqlite3.ErrConstraintUnique {
				zap.L().Error("error in inserting license data: ", zap.Error(sqliteErr))
				return &model.ApiError{Typ: model.ErrorConflict, Err: sqliteErr}
			}
		}
		zap.L().Error("error in inserting license data: ", zap.Error(err))
		return &model.ApiError{Typ: basemodel.ErrorExec, Err: err}
	}

	return nil
}

// UpdateLicenseV3 updates a new license v3 in db
func (r *Repo) UpdateLicenseV3(ctx context.Context, l *model.LicenseV3) error {

	// the key and id for the license can't change so only update the data here!
	query := `UPDATE licenses_v3 SET data=$1 WHERE id=$2;`

	license, err := json.Marshal(l.Data)
	if err != nil {
		return fmt.Errorf("insert license failed: license marshal error")
	}
	_, err = r.db.ExecContext(ctx,
		query,
		license,
		l.ID,
	)

	if err != nil {
		zap.L().Error("error in updating license data: ", zap.Error(err))
		return fmt.Errorf("failed to update license in db: %v", err)
	}

	return nil
}
