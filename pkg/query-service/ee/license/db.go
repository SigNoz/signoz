package license

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"go.signoz.io/query-service/ee/license/sqlite"
	"go.signoz.io/query-service/ee/model"
	"go.uber.org/zap"
)

// Repo is license repo. stores license keys in a secured DB
type Repo struct {
	db *sqlx.DB
}

// NewLicenseRepo initiates a new license repo
func NewLicenseRepo(db *sqlx.DB) Repo {
	return Repo{
		db: db,
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

// GetActiveLicense fetches the latest active license from DB
func (r *Repo) GetActiveLicense(ctx context.Context) (*model.License, error) {
	var err error
	licenses := []model.License{}

	query := "SELECT key, activationId, planDetails, validationMessage FROM licenses"

	err = r.db.Select(&licenses, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active licenses from db: %v", err)
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
		zap.S().Errorf("error in inserting license data: ", zap.Error(err))
		return fmt.Errorf("failed to insert license in db: %v", err)
	}

	return nil
}

// UpdatePlanDetails writes new plan details to the db
func (r *Repo) UpdatePlanDetails(ctx context.Context,
	key,
	planDetails string) error {

	if key == "" {
		return fmt.Errorf("Update Plan Details failed: license key is required")
	}

	query := `UPDATE licenses 
						SET planDetails = $1,
						updatedAt = $2
						WHERE key = $3`

	_, err := r.db.ExecContext(ctx, query, planDetails, time.Now(), key)

	if err != nil {
		zap.S().Errorf("error in updating license: ", zap.Error(err))
		return fmt.Errorf("failed to update license in db: %v", err)
	}

	return nil
}
