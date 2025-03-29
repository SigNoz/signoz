package licensetypes

import (
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type GettableLicenseParams struct {
	Active *bool
}

type GettableLicenses = []*License

type License interface {
	// ID returns the unique identifier for the license
	ID() valuer.UUID

	// Key returns the key for the license
	Key() string

	// CreatedAt returns the creation time for the license
	CreatedAt() time.Time

	// UpdatedAt returns the last update time for the license
	UpdatedAt() time.Time
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
