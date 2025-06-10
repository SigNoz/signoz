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
	// Activate validates and enables the license
	Activate(ctx context.Context, organizationID valuer.UUID, key string) error
	// GetActive fetches the current active license in org
	GetActive(ctx context.Context, organizationID valuer.UUID) (*licensetypes.License, error)
	// Refresh refreshes the license state from upstream server
	Refresh(ctx context.Context, organizationID valuer.UUID) error
	// Checkout creates a checkout session via upstream server and returns the redirection link
	Checkout(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error)
	// Portal creates a portal session via upstream server and return the redirection link
	Portal(ctx context.Context, organizationID valuer.UUID, postableSubscription *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error)
	// GetFeatureFlags fetches all the defined feature flags
	GetFeatureFlags(ctx context.Context, organizationID valuer.UUID) ([]*licensetypes.Feature, error)

	statsreporter.StatsCollector
}

type API interface {
	Activate(http.ResponseWriter, *http.Request)
	Refresh(http.ResponseWriter, *http.Request)
	GetActive(http.ResponseWriter, *http.Request)

	Checkout(http.ResponseWriter, *http.Request)
	Portal(http.ResponseWriter, *http.Request)
}
