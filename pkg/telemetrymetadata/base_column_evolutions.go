package telemetrymetadata

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// baseColumnEvolutionsTTL bounds how long a column evolution inserted by a
// migration while running goes unseen.
const baseColumnEvolutionsTTL = time.Minute

type cachedBaseColumnEvolutions struct {
	entries   []*telemetrytypes.EvolutionEntry
	fetchedAt time.Time
}

func (t *telemetryMetaStore) GetBaseColumnEvolutions(ctx context.Context, signal telemetrytypes.Signal, fieldContext telemetrytypes.FieldContext) ([]*telemetrytypes.EvolutionEntry, error) {
	selector := &telemetrytypes.EvolutionSelector{Signal: signal, FieldContext: fieldContext, FieldName: telemetrytypes.EvolutionFieldNameAll}

	t.baseColumnEvolutionsMu.Lock()
	defer t.baseColumnEvolutionsMu.Unlock()

	if cached, ok := t.baseColumnEvolutions[selector.QualifiedName()]; ok && time.Since(cached.fetchedAt) < baseColumnEvolutionsTTL {
		return cached.entries, nil
	}

	entries, err := t.fetchEvolutionEntryFromClickHouse(ctx, []*telemetrytypes.EvolutionSelector{selector})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch the column evolutions of %s", selector.QualifiedName())
	}
	t.baseColumnEvolutions[selector.QualifiedName()] = cachedBaseColumnEvolutions{entries: entries, fetchedAt: time.Now()}
	return entries, nil
}
