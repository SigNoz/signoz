package telemetrymetadata

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var CodeFailLoadBaseColumnEvolutions = errors.MustNewCode("fail_load_base_column_evolutions")

type schemaMetadataStore struct {
	telemetryStore       telemetrystore.TelemetryStore
	cacheTTL             time.Duration
	baseColumnEvolutions sync.Map
}

type cachedEvolutions struct {
	entries   []*telemetrytypes.EvolutionEntry
	fetchedAt time.Time
}

// A zero cacheTTL caches for the life of the process.
func NewSchemaMetadataStore(telemetryStore telemetrystore.TelemetryStore, cacheTTL time.Duration) telemetrytypes.SchemaMetadataStore {
	return &schemaMetadataStore{telemetryStore: telemetryStore, cacheTTL: cacheTTL}
}

// An empty result is not cached: the migrator can add the entries at runtime.
func (s *schemaMetadataStore) GetBaseColumnEvolutions(ctx context.Context, signal telemetrytypes.Signal, fieldContext telemetrytypes.FieldContext) ([]*telemetrytypes.EvolutionEntry, error) {
	selector := &telemetrytypes.EvolutionSelector{Signal: signal, FieldContext: fieldContext, FieldName: telemetrytypes.EvolutionFieldNameAll}
	if cached, ok := s.baseColumnEvolutions.Load(selector.QualifiedName()); ok {
		if cached := cached.(cachedEvolutions); s.cacheTTL == 0 || time.Since(cached.fetchedAt) < s.cacheTTL {
			return cached.entries, nil
		}
	}

	entries, err := fetchEvolutionEntryFromClickHouse(ctx, s.telemetryStore, fmt.Sprintf("%s.%s", DBName, ColumnEvolutionMetadataTableName), []*telemetrytypes.EvolutionSelector{selector})
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeFailLoadBaseColumnEvolutions, "failed to fetch the base column evolutions of %s", selector.QualifiedName())
	}
	if len(entries) > 0 {
		s.baseColumnEvolutions.Store(selector.QualifiedName(), cachedEvolutions{entries: entries, fetchedAt: time.Now()})
	}
	return entries, nil
}
