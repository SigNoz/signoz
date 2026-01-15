package gateway

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
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
	// Get Ingestions Keys (this is supposed to be for the current user but for now in gateway code this is ignoring the consumer user)
	GetIngestionKeys(ctx context.Context, orgID valuer.UUID, page, perPage int) ([]gatewaytypes.IngestionKey, error)

	// Search Ingestion Keys by Name (this is supposed to be for the current user but for now in gateway code this is ignoring the consumer user)
	SearchIngestionKeysByName(ctx context.Context, orgID valuer.UUID, name string, page, perPage int) ([]gatewaytypes.IngestionKey, error)

	// Create Ingestion Key
	CreateIngestionKey(ctx context.Context, orgID valuer.UUID, name string, tags []string, expiresAt time.Time) (*gatewaytypes.CreateIngestionKeyResponse, error)

	// Update Ingestion Key
	UpdateIngestionKey(ctx context.Context, orgID valuer.UUID, keyID string, name string, tags []string, expiresAt time.Time) error
}

type Handler interface {
	GetIngestionKeys(http.ResponseWriter, *http.Request)
	SearchIngestionKeys(http.ResponseWriter, *http.Request)
	CreateIngestionKey(http.ResponseWriter, *http.Request)
	UpdateIngestionKey(http.ResponseWriter, *http.Request)
}
