package promengine

import (
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
)

type PromEngine interface {
	// Engine returns the underlying promql engine
	Engine() *promql.Engine

	// Storage returns the underlying storage
	Storage() storage.Storage
}
