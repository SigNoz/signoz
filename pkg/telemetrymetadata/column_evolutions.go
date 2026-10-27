package telemetrymetadata

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// columnEvolutionsTTL bounds how long a column evolution inserted by a
// migration while running goes unseen.
const columnEvolutionsTTL = time.Minute

type cachedColumnEvolutions struct {
	entries   []*telemetrytypes.EvolutionEntry
	fetchedAt time.Time
}

func (t *telemetryMetaStore) GetColumnEvolutions(ctx context.Context, signal telemetrytypes.Signal, fieldContext telemetrytypes.FieldContext) ([]*telemetrytypes.EvolutionEntry, error) {
	selector := &telemetrytypes.EvolutionSelector{Signal: signal, FieldContext: fieldContext, FieldName: telemetrytypes.EvolutionFieldNameAll}

	t.columnEvolutionsMu.Lock()
	defer t.columnEvolutionsMu.Unlock()

	if cached, ok := t.columnEvolutions[selector.QualifiedName()]; ok && time.Since(cached.fetchedAt) < columnEvolutionsTTL {
		return cached.entries, nil
	}

	entries, err := t.fetchEvolutionEntryFromClickHouse(ctx, []*telemetrytypes.EvolutionSelector{selector})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch the column evolutions of %s", selector.QualifiedName())
	}
	t.columnEvolutions[selector.QualifiedName()] = cachedColumnEvolutions{entries: entries, fetchedAt: time.Now()}
	return entries, nil
}
