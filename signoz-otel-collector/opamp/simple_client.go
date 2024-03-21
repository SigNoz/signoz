package opamp

import (
	"context"

	"github.com/SigNoz/signoz-otel-collector/signozcol"
	"go.uber.org/zap"
)

type simpleClient struct {
	baseClient
}

func NewSimpleClient(coll *signozcol.WrappedCollector, logger *zap.Logger) *simpleClient {
	return &simpleClient{
		baseClient: baseClient{
			coll:    coll,
			err:     make(chan error),
			stopped: make(chan bool),
			logger:  logger.With(zap.String("component", "simple-client")),
		},
	}
}

func (c simpleClient) Start(ctx context.Context) error {
	c.logger.Info("Starting simple client")
	err := c.coll.Run(ctx)
	if err != nil {
		return err
	}
	go c.ensureRunning()
	return nil
}

func (c simpleClient) Stop(ctx context.Context) error {
	c.logger.Info("Stopping simple client")
	close(c.stopped)
	c.coll.Shutdown()
	return <-c.coll.ErrorChan()
}
