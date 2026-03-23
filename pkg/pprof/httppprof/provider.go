package httppprof

import (
	"context"
	"log/slog"
	"net/http"
	nethttppprof "net/http/pprof"
	runtimepprof "runtime/pprof"

	"github.com/SigNoz/signoz/pkg/factory"
	httpserver "github.com/SigNoz/signoz/pkg/http/server"
	"github.com/SigNoz/signoz/pkg/pprof"
)

type provider struct {
	server *httpserver.Server
}

func NewFactory() factory.ProviderFactory[pprof.PProf, pprof.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), New)
}

func New(_ context.Context, settings factory.ProviderSettings, config pprof.Config) (pprof.PProf, error) {
	server, err := httpserver.New(
		settings.Logger.With(slog.String("pkg", "github.com/SigNoz/signoz/pkg/pprof/httppprof")),
		httpserver.Config{Address: config.Address},
		newHandler(),
	)
	if err != nil {
		return nil, err
	}

	return &provider{server: server}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	return provider.server.Start(ctx)
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.server.Stop(ctx)
}

func newHandler() http.Handler {
	mux := http.NewServeMux()
	// Register the endpoints from net/http/pprof.
	mux.HandleFunc("/debug/pprof/", nethttppprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", nethttppprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", nethttppprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", nethttppprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", nethttppprof.Trace)

	// Register the runtime profiles in the same order returned by runtime/pprof.Profiles().
	for _, profile := range runtimepprof.Profiles() {
		mux.Handle("/debug/pprof/"+profile.Name(), nethttppprof.Handler(profile.Name()))
	}

	return mux
}
