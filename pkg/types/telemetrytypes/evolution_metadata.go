package telemetrytypes

import (
	"context"
	"time"
)

type KeyEvolutionMetadataKey struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	ReleaseTime    time.Time
}

type KeyEvolutionMetadataStore interface {
	Get(ctx context.Context, orgId, keyName string) []*KeyEvolutionMetadataKey
	Add(ctx context.Context, orgId, keyName string, key *KeyEvolutionMetadataKey)
}
