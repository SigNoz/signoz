package telemetrytypestest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// KeysVanishAfterFirstLookup drops the Vanished keys from every lookup after the
// first, as when the key tables are emptied while a statement is being built.
type KeysVanishAfterFirstLookup struct {
	*MockMetadataStore
	Vanished []string
	calls    int
}

func (s *KeysVanishAfterFirstLookup) GetKeysMulti(ctx context.Context, orgID valuer.UUID, selectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	keys, complete, err := s.MockMetadataStore.GetKeysMulti(ctx, orgID, selectors)
	s.calls++
	if s.calls > 1 {
		for _, name := range s.Vanished {
			delete(keys, name)
		}
	}
	return keys, complete, err
}
