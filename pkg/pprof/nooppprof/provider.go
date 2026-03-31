package nooppprof

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/pprof"
)

type provider struct {
	stopC    chan struct{}
	stopOnce sync.Once
}

func NewFactory() factory.ProviderFactory[pprof.PProf, pprof.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(_ context.Context, _ factory.ProviderSettings, _ pprof.Config) (pprof.PProf, error) {
	return &provider{stopC: make(chan struct{})}, nil
}

func (provider *provider) Start(context.Context) error {
	<-provider.stopC
	return nil
}

func (provider *provider) Stop(context.Context) error {
	provider.stopOnce.Do(func() {
		close(provider.stopC)
	})

	return nil
}
