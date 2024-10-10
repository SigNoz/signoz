package promql

import (
	"context"
	"fmt"
	"time"

	"github.com/go-kit/log"
	pmodel "github.com/prometheus/common/model"
	"github.com/prometheus/common/promlog"
	pconfig "github.com/prometheus/prometheus/config"
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

	logLevel := promlog.AllowedLevel{}
	logLevel.Set("debug")

	allowedFormat := promlog.AllowedFormat{}
	allowedFormat.Set("logfmt")

	promlogConfig := promlog.Config{
		Level:  &logLevel,
		Format: &allowedFormat,
	}

	logger := promlog.New(&promlogConfig)

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
		false,
	)
	fanoutStorage := pstorage.NewFanout(logger, remoteStorage)

	remoteStorage.ApplyConfig(config)

	return &PqlEngine{
		engine:        e,
		fanoutStorage: fanoutStorage,
	}, nil
}

func (p *PqlEngine) RunAlertQuery(ctx context.Context, qs string, start, end time.Time, interval time.Duration) (pql.Matrix, error) {
	q, err := p.engine.NewRangeQuery(ctx, p.fanoutStorage, nil, qs, start, end, interval)
	if err != nil {
		return nil, err
	}

	res := q.Exec(ctx)

	if res.Err != nil {
		return nil, res.Err
	}

	switch typ := res.Value.(type) {
	case pql.Vector:
		series := make([]pql.Series, 0, len(typ))
		value := res.Value.(pql.Vector)
		for _, smpl := range value {
			series = append(series, pql.Series{
				Metric: smpl.Metric,
				Floats: []pql.FPoint{{T: smpl.T, F: smpl.F}},
			})
		}
		return series, nil
	case pql.Scalar:
		value := res.Value.(pql.Scalar)
		series := make([]pql.Series, 0, 1)
		series = append(series, pql.Series{
			Floats: []pql.FPoint{{T: value.T, F: value.V}},
		})
		return series, nil
	case pql.Matrix:
		return res.Value.(pql.Matrix), nil
	default:
		return nil, fmt.Errorf("rule result is not a vector or scalar")
	}
}
