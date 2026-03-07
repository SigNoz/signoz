package prometheus

import (
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
)

type Engine = promql.Engine

type Prometheus interface {
	Engine() *Engine
	Storage() storage.Queryable
}
