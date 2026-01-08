package telemetrytypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type ColumnEvolutionMetadata struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	Path           string
	ReleaseTime    time.Time
}

type ColumnEvolutionMetadataStore interface {
	Get(ctx context.Context, orgId valuer.UUID, keyName string) []*ColumnEvolutionMetadata
}
