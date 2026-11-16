package noopcondensedmeter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/condensedmeter"
	"github.com/SigNoz/signoz/pkg/factory"
)

type provider struct {
	healthyC chan struct{}
	stopC    chan struct{}
}

func NewFactory() factory.ProviderFactory[condensedmeter.Reporter, condensedmeter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(_ context.Context, _ factory.ProviderSettings, _ condensedmeter.Config) (condensedmeter.Reporter, error) {
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
