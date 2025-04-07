package licensing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeLicensingServerNotFound = errors.MustNewCode("licensing_server_not_found")
)

type Licensing interface {
	factory.Service

	// GetLicenses gets the licenses for the organization.
	GetLicenses(context.Context, valuer.UUID, licensetypes.GettableLicenseParams) (licensetypes.GettableLicenses, error)

	// GetLatestLicense gets the latest license for the organization.
	GetLatestLicense(context.Context, valuer.UUID) (licensetypes.License, error)

	// SetLicense sets the license for the organization.
	SetLicense(context.Context, valuer.UUID, string) error
}
