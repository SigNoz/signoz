package implcloudintegration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type awsProvider struct{}

func (p *awsProvider) CreateArtifact(
	_ context.Context,
	_ valuer.UUID,
	_ *cloudintegrationtypes.ConnectionArtifactRequest,
	_ cloudintegration.Credentials,
	_ valuer.UUID,
) (*cloudintegrationtypes.ConnectionArtifact, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}
