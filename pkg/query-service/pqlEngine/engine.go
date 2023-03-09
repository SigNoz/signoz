package promql

import (
	"context"
	"fmt"
	"time"

	"github.com/go-kit/log"
	pmodel "github.com/prometheus/common/model"
	"github.com/prometheus/common/promlog"
	plog "github.com/prometheus/common/promlog"
	pconfig "github.com/prometheus/prometheus/config"
	plabels "github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	pql "github.com/prometheus/prometheus/promql"
	pstorage "github.com/prometheus/prometheus/storage"
	premote "github.com/prometheus/prometheus/storage/remote"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
)

type PqlEngine struct {
	engine        *pql.Engine
	fanoutStorage pstorage.Storage
}

func FromConfigPath(promConfigPath string) (*PqlEngine, error) {
	// load storage path
	c, err := pconfig.LoadFile(promConfigPath, false, false, nil)
	if err != nil {
		return nil, fmt.Errorf("couldn't load configuration (--config.file=%q): %v", promConfigPath, err)
	}

	return NewPqlEngine(c)
}

func FromReader(ch interfaces.Reader) (*PqlEngine, error) {
	return &PqlEngine{
		engine:        ch.GetQueryEngine(),
		fanoutStorage: *ch.GetFanoutStorage(),
	}, nil
}

func NewPqlEngine(config *pconfig.Config) (*PqlEngine, error) {

	logLevel := plog.AllowedLevel{}
	logLevel.Set("debug")

	allowedFormat := promlog.AllowedFormat{}
	allowedFormat.Set("logfmt")

	promlogConfig := promlog.Config{
		Level:  &logLevel,
		Format: &allowedFormat,
	}

	logger := plog.New(&promlogConfig)

	opts := pql.EngineOpts{
		Logger:     log.With(logger, "component", "promql evaluator"),
		Reg:        nil,
		MaxSamples: 50000000,
		Timeout:    time.Duration(2 * time.Minute),
		ActiveQueryTracker: pql.NewActiveQueryTracker(
			"",
			20,
			logger,
		),
	}

	e := pql.NewEngine(opts)
	startTime := func() (int64, error) {
		return int64(pmodel.Latest), nil
	}

	remoteStorage := premote.NewStorage(
		log.With(logger, "component", "remote"),
		nil,
		startTime,
		"",
		time.Duration(1*time.Minute),
		nil,
	)
	fanoutStorage := pstorage.NewFanout(logger, remoteStorage)

	remoteStorage.ApplyConfig(config)

	return &PqlEngine{
		engine:        e,
		fanoutStorage: fanoutStorage,
	}, nil
}

func (p *PqlEngine) RunAlertQuery(ctx context.Context, qs string, t time.Time) (pql.Vector, error) {
	q, err := p.engine.NewInstantQuery(p.fanoutStorage, &promql.QueryOpts{}, qs, t)
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
			Point:  pql.Point{T: v.T, V: v.V, H: nil},
			Metric: plabels.Labels{},
		}}, nil
	default:
		return nil, fmt.Errorf("rule result is not a vector or scalar")
	}
}
