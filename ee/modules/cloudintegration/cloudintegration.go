package cloudintegration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetConnectionArtifact(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType)
}

type CloudProvider interface{}
