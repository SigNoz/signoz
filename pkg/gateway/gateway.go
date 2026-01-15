package gateway

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeGatewayUnsupported   = errors.MustNewCode("gateway_unsupported")
	ErrCodeInvalidGatewayConfig = errors.MustNewCode("invalid_gateway_config")
)

const (
	DefaultPage     = 1
	DefaultPageSize = 10
	MaxPageSize     = 100
)

type Gateway interface {
	// Get key by workspace id
	GetIngestionKeysByWorkspaceID(ctx context.Context, orgID valuer.UUID, workspaceID valuer.UUID, page, perPage int) ([]byte, error)
}

type Handler interface {
	GetIngestionKeys(http.ResponseWriter, *http.Request)
}
