package licensing

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeUnsupported        = errors.MustNewCode("licensing_unsupported")
	ErrCodeFeatureUnavailable = errors.MustNewCode("feature_unavailable")
)

type Licensing interface {
	factory.Service

	// Validate validates the license with the upstream server
	Validate(ctx context.Context) error
	// Activate validates the key with the upstream server and enables the license
	Activate(ctx context.Context, organizationID valuer.UUID, key string) (*licensetypes.License, error)
	// GetActive fetches the current active license in org
	GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.License, error)
	// Get fetches the license by id in org
	Get(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) (*licensetypes.License, error)
	// List fetches all the licenses in org
	List(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.License, error)
	// Delete deletes the license by id in org, cloud licenses cannot be deleted
	Delete(ctx context.Context, organizationID valuer.UUID, licenseID valuer.UUID) error
	// Refresh refreshes the license state from upstream server
	Refresh(ctx context.Context, organizationID valuer.UUID) error
	// GetFeatureFlags fetches all the defined feature flags
	GetFeatureFlags(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.Feature, error)

	statsreporter.StatsCollector
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	ActivateDeprecated(http.ResponseWriter, *http.Request)

	RefreshDeprecated(http.ResponseWriter, *http.Request)

	List(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	Refresh(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)

	GetActive(http.ResponseWriter, *http.Request)
}
