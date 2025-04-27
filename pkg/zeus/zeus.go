package zeus

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
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

	// Puts the meters for the given license key.
	PutMeters(context.Context, string, []byte) error

	// Put profile for the given license key.
	PutProfile(context.Context, string, []byte) error

	// Put host for the given license key.
	PutHost(context.Context, string, []byte) error
}
