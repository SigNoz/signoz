package openfgaauthz

import (
	"context"

	authz "github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/openfgaauthz/schema"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	language "github.com/openfga/language/pkg/go/transformer"
	"github.com/openfga/openfga/pkg/server"
)

type provider struct {
	config   authz.Config
	settings factory.ScopedProviderSettings
	server   *server.Server
	stopChan chan struct{}
}

func NewProviderFactory(sqlstoreConfig sqlstore.Config) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstoreConfig)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstoreConfig sqlstore.Config) (authz.AuthZ, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/authz/openfgaauthz")

	// setup connections and run the migrations
	sqlstore, err := NewStore(storeConfig{sqlstoreConfig: sqlstoreConfig})
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to initialize sqlstore for authz")
		return nil, err
	}

	// setup the openfga server
	opts := []server.OpenFGAServiceV1Option{
		server.WithDatastore(sqlstore),
		server.WithLogger(NewLogger(scopedProviderSettings.Logger())),
	}
	openfgaServer, err := server.NewServerWithOpts(opts...)
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to create authz server")
		return nil, err
	}

	return &provider{
		config:   config,
		settings: scopedProviderSettings,
		server:   openfgaServer,
		stopChan: make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	storeId, err := provider.getOrCreateStore(ctx)
	if err != nil {
		provider.settings.Logger().DebugContext(ctx, "failed to getOrCreateStore")
		return err
	}

	err = provider.getOrCreateAuthorisationModel(ctx, storeId)
	if err != nil {
		provider.settings.Logger().DebugContext(ctx, "failed to getOrCreateAuthorisationModel")
		return err
	}

	<-provider.stopChan
	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	provider.server.Close()
	close(provider.stopChan)
	return nil
}

func (provider *provider) getOrCreateStore(ctx context.Context) (string, error) {
	stores, err := provider.server.ListStores(ctx, &openfgav1.ListStoresRequest{})
	if err != nil {
		return "", err
	}

	for _, store := range stores.GetStores() {
		if store.GetName() == "signoz" {
			return store.Id, nil
		}
	}

	store, err := provider.server.CreateStore(ctx, &openfgav1.CreateStoreRequest{Name: "signoz"})
	if err != nil {
		return "", err
	}

	return store.Id, nil
}

func (provider *provider) getOrCreateAuthorisationModel(ctx context.Context, storeId string) error {
	schema, err := language.TransformModuleFilesToModel(schema.SchemaModules, "1.1")
	if err != nil {
		return err
	}

	authorisationModels, err := provider.server.ReadAuthorizationModels(ctx, &openfgav1.ReadAuthorizationModelsRequest{StoreId: storeId})
	if err != nil {
		return err
	}

	for _, authModel := range authorisationModels.GetAuthorizationModels() {
		if authModel.Id == schema.Id {
			return nil
		}
	}

	_, err = provider.server.WriteAuthorizationModel(ctx, &openfgav1.WriteAuthorizationModelRequest{
		StoreId:         storeId,
		TypeDefinitions: schema.TypeDefinitions,
		SchemaVersion:   schema.SchemaVersion,
		Conditions:      schema.Conditions,
	})
	if err != nil {
		return err
	}

	return nil
}
