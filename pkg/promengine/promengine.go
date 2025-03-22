package promengine

import (
	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
)

type PromEngine interface {
	// Engine returns the underlying promql engine
	Engine() *promql.Engine

	// Storage returns the underlying storage
	Storage() storage.Storage
}

// init initializes the prometheus model with UTF8 validation
func init() {
	model.NameValidationScheme = model.UTF8Validation
}
