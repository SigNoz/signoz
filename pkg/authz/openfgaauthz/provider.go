package openfgaauthz

import (
	"context"

	authz "github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/openfgaauthz/authorizationmodel"
	"github.com/SigNoz/signoz/pkg/authz/openfgaauthz/store"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	openfgapkgserver "github.com/openfga/openfga/pkg/server"
)

type provider struct {
	config                authz.Config
	settings              factory.ScopedProviderSettings
	openfgaServer         *openfgapkgserver.Server
	authorizationModelAPI authorizationmodel.API
	storeAPI              store.API
	stopChan              chan struct{}
}

func NewProviderFactory(sqlstoreConfig sqlstore.Config) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstoreConfig)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstoreConfig sqlstore.Config) (authz.AuthZ, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/authz/openfgaauthz")

	// setup connections and run the migrations
	sqlstore, err := NewSQLStore(storeConfig{sqlstoreConfig: sqlstoreConfig})
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to initialize sqlstore for authz")
		return nil, err
	}

	// setup the openfga server
	opts := []openfgapkgserver.OpenFGAServiceV1Option{
		openfgapkgserver.WithDatastore(sqlstore),
		openfgapkgserver.WithLogger(NewLogger(scopedProviderSettings.Logger())),
	}
	openfgaServer, err := openfgapkgserver.NewServerWithOpts(opts...)
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to create authz server")
		return nil, err
	}

	return &provider{
		config:                config,
		settings:              scopedProviderSettings,
		openfgaServer:         openfgaServer,
		stopChan:              make(chan struct{}),
		authorizationModelAPI: authorizationmodel.NewAPI(openfgaServer),
		storeAPI:              store.NewAPI(openfgaServer),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	storeId, err := provider.storeAPI.GetOrCreate(ctx, "signoz")
	if err != nil {
		return err
	}

	_, err = provider.authorizationModelAPI.GetOrCreate(ctx, storeId)
	if err != nil {
		provider.settings.Logger().DebugContext(ctx, "failed to getOrCreateAuthorisationModel")
		return err
	}

	<-provider.stopChan
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	provider.openfgaServer.Close()
	close(provider.stopChan)
	return nil
}
