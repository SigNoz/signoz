package promql

import (
	"github.com/go-kit/log"

	plog "github.com/prometheus/common/promlog"
	pconfig "github.com/prometheus/prometheus/config"
	pql "github.com/prometheus/prometheus/promql"
	pstorage "github.com/prometheus/prometheus/storage"
	premote "github.com/prometheus/prometheus/storage/remote"
	"time"
)

type PqlEngine struct {
	engine        *pql.Engine
	fanoutStorage pstorage.Storage
}

func NewEvaluator(config *pconfig.Config) (*PqlEngine, error) {

	logLevel := plog.AllowedLevel{}
	logLevel.Set("debug")
	logger := plog.New(logLevel)

	opts := pql.EngineOpts{
		Logger:        log.With(logger, "component", "promql evaluator"),
		Reg:           nil,
		MaxConcurrent: 20,
		MaxSamples:    50000000,
		Timeout:       time.Duration(2 * time.Minute),
	}

	e := pql.NewEngine(opts)
	remoteStorage := premote.NewStorage(log.With(logger, "component", "remote"), startTime, time.Duration(1*time.Minute))
	fanoutStorage := pstorage.NewFanout(logger, remoteStorage)

	remoteStorage.ApplyConfig(config)

	return &PqlEngine{
		engine:        e,
		fanoutStorage: fanoutStorage,
	}, nil
}
