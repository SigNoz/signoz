package licensing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Licensing interface {
	// GetLicenses gets the licenses for the organization.
	GetLicenses(context.Context, valuer.UUID, licensetypes.GettableLicenseParams) (licensetypes.GettableLicenses, error)
}
