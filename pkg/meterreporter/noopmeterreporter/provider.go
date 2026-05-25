package noopmeterreporter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/meterreporter"
)

type provider struct {
	healthyC chan struct{}
	stopC    chan struct{}
}

func NewFactory() factory.ProviderFactory[meterreporter.Reporter, meterreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(_ context.Context, _ factory.ProviderSettings, _ meterreporter.Config) (meterreporter.Reporter, error) {
	return &provider{
		healthyC: make(chan struct{}),
		stopC:    make(chan struct{}),
	}, nil
}

func (p *provider) Start(_ context.Context) error {
	close(p.healthyC)
	<-p.stopC
	return nil
}

func (p *provider) Stop(_ context.Context) error {
	close(p.stopC)
	return nil
}

func (p *provider) Healthy() <-chan struct{} {
	return p.healthyC
}
