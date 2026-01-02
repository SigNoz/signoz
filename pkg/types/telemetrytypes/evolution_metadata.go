package telemetrytypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type KeyEvolutionMetadata struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	Path           string
	ReleaseTime    time.Time
}

type KeyEvolutionMetadataStore interface {
	Get(ctx context.Context, orgId valuer.UUID, keyName string) []*KeyEvolutionMetadata
}
