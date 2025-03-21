package promenginetest

import (
	"time"

	"github.com/SigNoz/signoz/pkg/promengine"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
)

var _ promengine.PromEngine = (*Engine)(nil)

type Engine struct {
	engine  *promql.Engine
	storage storage.Storage
}

func New(outOfOrderTimeWindow ...int64) (*Engine, error) {
	engine := promql.NewEngine(promql.EngineOpts{
		Logger:             nil,
		Reg:                nil,
		MaxSamples:         50000000,
		Timeout:            time.Duration(2 * time.Minute),
		ActiveQueryTracker: nil,
	})

	testStorage, err := NewStorageWithError(outOfOrderTimeWindow...)
	if err != nil {
		return nil, err
	}

	fanoutStorage := storage.NewFanout(nil, testStorage)

	return &Engine{
		engine:  engine,
		storage: fanoutStorage,
	}, nil
}

func (e *Engine) Engine() *promql.Engine {
	return e.engine
}

func (e *Engine) Storage() storage.Storage {
	return e.storage
}
