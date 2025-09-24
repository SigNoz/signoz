package openfgaauthz

import (
	"context"
	"sync"

	authz "github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
	openfgapkgserver "github.com/openfga/openfga/pkg/server"
	"google.golang.org/protobuf/encoding/protojson"
)

var (
	openfgaDefaultStore = valuer.NewString("signoz")
)

type provider struct {
	config        authz.Config
	settings      factory.ScopedProviderSettings
	openfgaSchema []openfgapkgtransformer.ModuleFile
	openfgaServer *openfgapkgserver.Server
	storeID       string
	modelID       string
	mtx           sync.RWMutex
	stopChan      chan struct{}
}

func NewProviderFactory(sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) factory.ProviderFactory[authz.AuthZ, authz.Config] {
	return factory.NewProviderFactory(factory.MustNewName("openfga"), func(ctx context.Context, ps factory.ProviderSettings, config authz.Config) (authz.AuthZ, error) {
		return newOpenfgaProvider(ctx, ps, config, sqlstore, openfgaSchema)
	})
}

func newOpenfgaProvider(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) (authz.AuthZ, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/authz/openfgaauthz")

	store, err := NewSQLStore(sqlstore)
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to initialize sqlstore for authz")
		return nil, err
	}

	// setup the openfga server
	opts := []openfgapkgserver.OpenFGAServiceV1Option{
		openfgapkgserver.WithDatastore(store),
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
		mtx:           sync.RWMutex{},
		stopChan:      make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	storeId, err := provider.getOrCreateStore(ctx, openfgaDefaultStore.StringValue())
	if err != nil {
		return err
	}

	modelID, err := provider.getOrCreateModel(ctx, storeId)
	if err != nil {
		return err
	}

	provider.mtx.Lock()
	provider.modelID = modelID
	provider.storeID = storeId
	provider.mtx.Unlock()

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

func (provider *provider) Check(ctx context.Context, tupleReq *openfgav1.CheckRequestTupleKey) error {
	checkResponse, err := provider.openfgaServer.Check(
		ctx,
		&openfgav1.CheckRequest{
			StoreId:              provider.storeID,
			AuthorizationModelId: provider.modelID,
			TupleKey:             tupleReq,
		})
	if err != nil {
		return errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthZUnavailable, "authorization server is unavailable").WithAdditional(err.Error())
	}

	if !checkResponse.Allowed {
		return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subject %s cannot %s object %s", tupleReq.User, tupleReq.Relation, tupleReq.Object)
	}

	return nil
}

func (provider *provider) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, relation authtypes.Relation, typeable authtypes.Typeable, selector authtypes.Selector, parentTypeable authtypes.Typeable, parentSelectors ...authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeUser, claims.UserID, authtypes.Relation{})
	if err != nil {
		return err
	}

	tuples, err := typeable.Tuples(subject, relation, selector, parentTypeable, parentSelectors...)
	if err != nil {
		return err
	}

	check, err := provider.sequentialCheck(ctx, tuples)
	if err != nil {
		return err
	}
	if !check {
		return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subject %s cannot %s object %s", subject, relation.StringValue(), typeable.Type().StringValue())
	}

	return nil
}

func (provider *provider) sequentialCheck(ctx context.Context, tuplesReq []*openfgav1.CheckRequestTupleKey) (bool, error) {
	for _, tupleReq := range tuplesReq {
		err := provider.Check(ctx, tupleReq)
		if err == nil {
			return true, nil
		}
		if errors.Ast(err, errors.TypeInternal) {
			// return at the first internal error as the evaluation will be incorrect
			return false, err
		}
	}

	return false, nil
}
