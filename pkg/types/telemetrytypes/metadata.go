package telemetrytypes

import "time"

type KeyEvolutionMetadataKey struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	ReleaseTime    time.Time
}

type KeyEvolutionMetadataStore interface {
	Get(keyName string) []*KeyEvolutionMetadataKey
	Add(keyName string, key *KeyEvolutionMetadataKey)
}
