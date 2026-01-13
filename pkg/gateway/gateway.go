package gateway

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeGatewayUnsupported   = errors.MustNewCode("gateway_unsupported")
	ErrCodeInvalidGatewayConfig = errors.MustNewCode("invalid_gateway_config")
)

type Gateway interface {
	// Get key by workspace id
	GetIngestionKeysByWorkspaceID(ctx context.Context, workspaceID string, page, perPage int) ([]byte, error)
}
