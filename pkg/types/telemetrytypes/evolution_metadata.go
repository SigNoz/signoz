package telemetrytypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type KeyEvolutionMetadataKey struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	ReleaseTime    time.Time
}

type KeyEvolutionMetadataStore interface {
	Get(ctx context.Context, orgId valuer.UUID, keyName string) []*KeyEvolutionMetadataKey
}
