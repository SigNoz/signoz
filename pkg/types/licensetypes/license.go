package licensetypes

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type GettableLicenseParams struct {
	Active *bool
}

type GettableLicenses = []License

type License interface {
	// ID returns the unique identifier for the license
	ID() valuer.UUID

	// OrgID returns the organization ID for the license
	OrgID() valuer.UUID

	// Contents returns the raw data for the license
	Contents() []byte

	// Key returns the key for the license
	Key() string

	// CreatedAt returns the creation time for the license
	CreatedAt() time.Time

	// UpdatedAt returns the last update time for the license
	UpdatedAt() time.Time

	// FeatureValues returns the feature values for the license
	FeatureValues() []*featuretypes.FeatureValue
}

func NewGettableLicenseParams(req *http.Request) (GettableLicenseParams, error) {
	params := GettableLicenseParams{
		Active: nil,
	}

	queryValues := req.URL.Query()

	if active := queryValues.Get("active"); active != "" {
		activeBool, err := strconv.ParseBool(active)
		if err != nil {
			return GettableLicenseParams{}, err
		}

		params.Active = &activeBool
	}

	return params, nil
}

type Store interface {
	// Set creates or updates a license.
	Set(context.Context, License) error

	// Get returns the license for the given orgID
	Get(context.Context, valuer.UUID) ([]License, error)

	// GetLatest returns the latest license for the given orgID
	GetLatest(context.Context, valuer.UUID) (License, error)

	// ListOrgs returns the list of orgs
	ListOrgs(context.Context) ([]valuer.UUID, error)
}
