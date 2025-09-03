package openfgaauthz

import (
	"context"

	authz "github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authztypes"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
	openfgapkgserver "github.com/openfga/openfga/pkg/server"
	"google.golang.org/protobuf/encoding/protojson"
)

type provider struct {
	config        authz.Config
	settings      factory.ScopedProviderSettings
	openfgaSchema []openfgapkgtransformer.ModuleFile
	openfgaServer *openfgapkgserver.Server
	stopChan      chan struct{}
}

func NewProviderFactory(sqlstoreConfig sqlstore.Config, openfgaSchema []openfgapkgtransformer.ModuleFile) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstoreConfig, openfgaSchema)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstoreConfig sqlstore.Config, openfgaSchema []openfgapkgtransformer.ModuleFile) (authz.AuthZ, error) {
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
		config:        config,
		settings:      scopedProviderSettings,
		openfgaServer: openfgaServer,
		openfgaSchema: openfgaSchema,
		stopChan:      make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	storeId, err := provider.getOrCreateStore(ctx, authztypes.OpenfgaDefaultStore.StringValue())
	if err != nil {
		return err
	}

	_, err = provider.getOrCreateModel(ctx, storeId)
	if err != nil {
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

func (provider *provider) getOrCreateStore(ctx context.Context, name string) (string, error) {
	stores, err := provider.openfgaServer.ListStores(ctx, &openfgav1.ListStoresRequest{})
	if err != nil {
		return "", err
	}

	for _, store := range stores.GetStores() {
		if store.GetName() == name {
			return store.Id, nil
		}
	}

	store, err := provider.openfgaServer.CreateStore(ctx, &openfgav1.CreateStoreRequest{Name: name})
	if err != nil {
		return "", err
	}

	return store.Id, nil
}

func (provider *provider) getStore(ctx context.Context, name string) (string, error) {
	stores, err := provider.openfgaServer.ListStores(ctx, &openfgav1.ListStoresRequest{})
	if err != nil {
		return "", err
	}

	for _, store := range stores.GetStores() {
		if store.GetName() == name {
			return store.Id, nil
		}
	}

	return "", errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no store found with name %s", name)
}

func (provider *provider) getOrCreateModel(ctx context.Context, storeID string) (string, error) {
	schema, err := openfgapkgtransformer.TransformModuleFilesToModel(provider.openfgaSchema, "1.1")
	if err != nil {
		return "", err
	}

	authorisationModels, err := provider.openfgaServer.ReadAuthorizationModels(ctx, &openfgav1.ReadAuthorizationModelsRequest{StoreId: storeID})
	if err != nil {
		return "", err
	}

	for _, authModel := range authorisationModels.GetAuthorizationModels() {
		equal, err := provider.isModelEqual(schema, authModel)
		if err != nil {
			return "", err
		}
		if equal {
			return authModel.Id, nil
		}
	}

	authorizationModel, err := provider.openfgaServer.WriteAuthorizationModel(ctx, &openfgav1.WriteAuthorizationModelRequest{
		StoreId:         storeID,
		TypeDefinitions: schema.TypeDefinitions,
		SchemaVersion:   schema.SchemaVersion,
		Conditions:      schema.Conditions,
	})
	if err != nil {
		return "", err
	}

	return authorizationModel.AuthorizationModelId, nil
}

func (provider *provider) getModel(ctx context.Context, storeID string) (string, error) {
	schema, err := openfgapkgtransformer.TransformModuleFilesToModel(provider.openfgaSchema, "1.1")
	if err != nil {
		return "", err
	}

	authorisationModels, err := provider.openfgaServer.ReadAuthorizationModels(ctx, &openfgav1.ReadAuthorizationModelsRequest{StoreId: storeID})
	if err != nil {
		return "", err
	}

	for _, authModel := range authorisationModels.GetAuthorizationModels() {
		equal, err := provider.isModelEqual(schema, authModel)
		if err != nil {
			return "", err
		}
		if equal {
			return authModel.Id, nil
		}
	}

	return "", errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no model in sync with latest schema found with storeID %s", storeID)
}

// the language model doesn't have any equality check
// https://github.com/openfga/language/blob/main/pkg/go/transformer/module-to-model_test.go#L38
func (provider *provider) isModelEqual(expected *openfgav1.AuthorizationModel, actual *openfgav1.AuthorizationModel) (bool, error) {
	// we need to initialize a new model since the model extracted from schema doesn't have id
	expectedAuthModel := openfgav1.AuthorizationModel{
		SchemaVersion:   expected.SchemaVersion,
		TypeDefinitions: expected.TypeDefinitions,
		Conditions:      expected.Conditions,
	}
	expectedAuthModelBytes, err := protojson.Marshal(&expectedAuthModel)
	if err != nil {
		return false, err
	}

	actualAuthModel := openfgav1.AuthorizationModel{
		SchemaVersion:   actual.SchemaVersion,
		TypeDefinitions: actual.TypeDefinitions,
		Conditions:      actual.Conditions,
	}
	actualAuthModelBytes, err := protojson.Marshal(&actualAuthModel)
	if err != nil {
		return false, err
	}

	return string(expectedAuthModelBytes) == string(actualAuthModelBytes), nil

}

func (provider *provider) Check(ctx context.Context, tupleReq *openfgav1.CheckRequestTupleKey) (bool, error) {
	storeID, err := provider.getStore(ctx, authztypes.OpenfgaDefaultStore.String())
	if err != nil {
		return false, err
	}
	modelID, err := provider.getModel(ctx, storeID)
	if err != nil {
		return false, err
	}

	checkResponse, err := provider.openfgaServer.Check(
		ctx,
		&openfgav1.CheckRequest{
			StoreId:              storeID,
			AuthorizationModelId: modelID,
			TupleKey:             tupleReq,
		})
	if err != nil {
		return false, err
	}

	return checkResponse.Allowed, nil
}
