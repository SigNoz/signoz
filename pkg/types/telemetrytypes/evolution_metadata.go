package telemetrytypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	KeyEvolutionMetadataCacheKeyPrefix = "key_evolution_metadata:"
)

type EvolutionEntry struct {
	Signal       Signal
	ColumnName   string
	ColumnType   string
	FieldContext FieldContext
	FieldName    string
	ReleaseTime  time.Time
}

type EvolutionSelector struct {
	Signal       Signal
	FieldContext FieldContext
	FieldName    string
}

type ColumnEvolutionMetadataStore interface {
	Get(ctx context.Context, orgId valuer.UUID, keyName string) []*EvolutionEntry
}

func GetEvolutionMetadataCacheKey(selector *EvolutionSelector) string {
	return KeyEvolutionMetadataCacheKeyPrefix + selector.Signal.StringValue() + ":" + selector.FieldContext.StringValue() + ":" + selector.FieldName

}
