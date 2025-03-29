package zeus

import (
	"context"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
)

type Zeus interface {
	// Returns the license for the given key.
	GetLicense(context.Context, string) (*licensetypes.License, error)

	// Returns the checkout URL for the given license key.
	GetCheckoutURL(context.Context, string) (string, error)

	// Returns the portal URL for the given license key.
	GetPortalURL(context.Context, string) (string, error)

	// Returns the deployment for the given license key.
	GetDeployment(context.Context, string) ([]byte, error)

	// Puts the meter for the given license key.
	PutUsage(context.Context)
}
