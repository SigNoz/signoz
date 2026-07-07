package zeus

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
)

var (
	ErrCodeUnsupported       = errors.MustNewCode("zeus_unsupported")
	ErrCodeResponseMalformed = errors.MustNewCode("zeus_response_malformed")
)

type Zeus interface {
	// Returns the license for the given key.
	GetLicense(context.Context, string) ([]byte, error)

	// Returns the checkout URL for the given license key.
	GetCheckoutURL(context.Context, string, []byte) ([]byte, error)

	// Returns the portal URL for the given license key.
	GetPortalURL(context.Context, string, []byte) ([]byte, error)

	// Returns the deployment for the given license key.
	GetDeployment(context.Context, string) ([]byte, error)

	// Returns the billing details for the given license key.
	GetMeters(context.Context, string) ([]byte, error)

	// Puts the meters for the given license key using the legacy subscriptions service.
	PutMeters(context.Context, string, []byte) error

	// Puts the meters for the given license key using Zeus.
	PutMetersV2(context.Context, string, []byte) error

	// PutMetersV3 ships one day's raw JSON array of meter readings to the
	// v2/meters endpoint. idempotencyKey is propagated as X-Idempotency-Key so
	// Zeus can UPSERT on retries.
	PutMetersV3(ctx context.Context, licenseKey string, idempotencyKey string, body []byte) error

	// ListMeterCheckpoints returns the latest sealed (is_completed=true) UTC day
	// Zeus has stored for each billing meter name. Missing meter names are
	// treated by the cron as bootstrap cases.
	ListMeterCheckpoints(ctx context.Context, licenseKey string) ([]zeustypes.MeterCheckpoint, error)

	// Put profile for the given license key.
	PutProfile(context.Context, string, *zeustypes.PostableProfile) error

	// Put host for the given license key.
	PutHost(context.Context, string, *zeustypes.PostableHost) error
}

type Handler interface {
	// API level handler for PutProfile
	PutProfile(http.ResponseWriter, *http.Request)

	// API level handler for getting hosts a slim wrapper around GetDeployment
	GetHosts(http.ResponseWriter, *http.Request)

	// API level handler for PutHost
	PutHost(http.ResponseWriter, *http.Request)
}
