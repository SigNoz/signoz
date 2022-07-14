package promql

import (
	"context"
	"fmt"
	"github.com/go-kit/log"
	pmodel "github.com/prometheus/common/model"
	plog "github.com/prometheus/common/promlog"
	pconfig "github.com/prometheus/prometheus/config"
	plabels "github.com/prometheus/prometheus/pkg/labels"
	pql "github.com/prometheus/prometheus/promql"
	pstorage "github.com/prometheus/prometheus/storage"
	premote "github.com/prometheus/prometheus/storage/remote"
	"time"
)

type PqlEngine struct {
	engine        *pql.Engine
	fanoutStorage pstorage.Storage
}

func FromConfigPath(promConfigPath string) (*PqlEngine, error) {
	// load storage path
	c, err := pconfig.LoadFile(promConfigPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't load configuration (--config.file=%q): %v", promConfigPath, err)
	}

	return NewPqlEngine(c)
}

func NewPqlEngine(config *pconfig.Config) (*PqlEngine, error) {

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
	startTime := func() (int64, error) {
		return int64(pmodel.Latest), nil
	}

	remoteStorage := premote.NewStorage(log.With(logger, "component", "remote"), startTime, time.Duration(1*time.Minute))
	fanoutStorage := pstorage.NewFanout(logger, remoteStorage)

	remoteStorage.ApplyConfig(config)

	return &PqlEngine{
		engine:        e,
		fanoutStorage: fanoutStorage,
	}, nil
}

func (p *PqlEngine) RunAlertQuery(ctx context.Context, qs string, t time.Time) (pql.Vector, error) {
	q, err := p.engine.NewInstantQuery(p.fanoutStorage, qs, t)
	if err != nil {
		return nil, err
	}

	res := q.Exec(ctx)

	if res.Err != nil {
		return nil, res.Err
	}

	switch v := res.Value.(type) {
	case pql.Vector:
		return v, nil
	case pql.Scalar:
		return pql.Vector{pql.Sample{
			Point:  pql.Point(v),
			Metric: plabels.Labels{},
		}}, nil
	default:
		return nil, fmt.Errorf("rule result is not a vector or scalar")
	}
}
