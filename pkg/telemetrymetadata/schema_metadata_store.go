package telemetrymetadata

import (
	"context"
	"fmt"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type schemaMetadataStore struct {
	telemetryStore       telemetrystore.TelemetryStore
	baseColumnEvolutions sync.Map
}

func NewSchemaMetadataStore(telemetryStore telemetrystore.TelemetryStore) telemetrytypes.SchemaMetadataStore {
	return &schemaMetadataStore{telemetryStore: telemetryStore}
}

// GetBaseColumnEvolutions caches found entries for the life of the process, as
// entries are only ever added. An empty result is not cached: the migrator can
// add the entries at runtime.
func (s *schemaMetadataStore) GetBaseColumnEvolutions(ctx context.Context, signal telemetrytypes.Signal, fieldContext telemetrytypes.FieldContext) ([]*telemetrytypes.EvolutionEntry, error) {
	selector := &telemetrytypes.EvolutionSelector{Signal: signal, FieldContext: fieldContext, FieldName: telemetrytypes.EvolutionFieldNameAll}
	if cached, ok := s.baseColumnEvolutions.Load(selector.QualifiedName()); ok {
		return cached.([]*telemetrytypes.EvolutionEntry), nil
	}

	entries, err := fetchEvolutionEntries(ctx, s.telemetryStore, fmt.Sprintf("%s.%s", DBName, ColumnEvolutionMetadataTableName), []*telemetrytypes.EvolutionSelector{selector})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch the base column evolutions of %s", selector.QualifiedName())
	}
	if len(entries) > 0 {
		s.baseColumnEvolutions.Store(selector.QualifiedName(), entries)
	}
	return entries, nil
}
