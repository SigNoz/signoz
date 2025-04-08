package licensing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Licensing interface {
	factory.Service

	GetActiveLicense(context.Context, valuer.UUID) (licensetypes.License, error)
}
