package openfgaserver

import (
	"context"
	"strconv"
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

type Server struct {
	config        authz.Config
	settings      factory.ScopedProviderSettings
	openfgaSchema []openfgapkgtransformer.ModuleFile
	openfgaServer *openfgapkgserver.Server
	storeID       string
	modelID       string
	mtx           sync.RWMutex
	stopChan      chan struct{}
}

func NewOpenfgaServer(ctx context.Context, settings factory.ProviderSettings, config authz.Config, sqlstore sqlstore.SQLStore, openfgaSchema []openfgapkgtransformer.ModuleFile) (*Server, error) {
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
		openfgapkgserver.WithContextPropagationToDatastore(true),
	}
	openfgaServer, err := openfgapkgserver.NewServerWithOpts(opts...)
	if err != nil {
		scopedProviderSettings.Logger().DebugContext(ctx, "failed to create authz server")
		return nil, err
	}

	return &Server{
		config:        config,
		settings:      scopedProviderSettings,
		openfgaServer: openfgaServer,
		openfgaSchema: openfgaSchema,
		mtx:           sync.RWMutex{},
		stopChan:      make(chan struct{}),
	}, nil
}

func (server *Server) Start(ctx context.Context) error {
	storeID, err := server.getOrCreateStore(ctx, openfgaDefaultStore.StringValue())
	if err != nil {
		return err
	}

	modelID, err := server.getOrCreateModel(ctx, storeID)
	if err != nil {
		return err
	}

	server.mtx.Lock()
	server.modelID = modelID
	server.storeID = storeID
	server.mtx.Unlock()

	<-server.stopChan
	return nil
}

func (server *Server) Stop(ctx context.Context) error {
	server.openfgaServer.Close()
	close(server.stopChan)
	return nil
}

func (server *Server) BatchCheck(ctx context.Context, tupleReq map[string]*openfgav1.TupleKey) (map[string]*authtypes.TupleKeyAuthorization, error) {
	storeID, modelID := server.getStoreIDandModelID()
	batchCheckItems := make([]*openfgav1.BatchCheckItem, 0, len(tupleReq))
	for id, tuple := range tupleReq {
		batchCheckItems = append(batchCheckItems, &openfgav1.BatchCheckItem{
			TupleKey: &openfgav1.CheckRequestTupleKey{
				User:     tuple.User,
				Relation: tuple.Relation,
				Object:   tuple.Object,
			},
			// Use transaction ID as correlation ID for deterministic mapping
			CorrelationId: id,
		})
	}

	checkResponse, err := server.openfgaServer.BatchCheck(
		ctx,
		&openfgav1.BatchCheckRequest{
			StoreId:              storeID,
			AuthorizationModelId: modelID,
			Checks:               batchCheckItems,
		})
	if err != nil {
		return nil, errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthZUnavailable, "authorization server is unavailable").WithAdditional(err.Error())
	}

	response := make(map[string]*authtypes.TupleKeyAuthorization, len(tupleReq))
	for id, tuple := range tupleReq {
		response[id] = &authtypes.TupleKeyAuthorization{
			Tuple:      tuple,
			Authorized: checkResponse.Result[id].GetAllowed(),
		}
	}

	return response, nil
}

func (server *Server) CheckWithTupleCreation(ctx context.Context, claims authtypes.Claims, orgID valuer.UUID, _ authtypes.Relation, _ authtypes.Typeable, _ []authtypes.Selector, roleSelectors []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableUser, claims.UserID, orgID, nil)
	if err != nil {
		return err
	}

	tupleSlice, err := authtypes.TypeableRole.Tuples(subject, authtypes.RelationAssignee, roleSelectors, orgID)
	if err != nil {
		return err
	}

	// Convert slice to map with generated IDs for internal use
	tuples := make(map[string]*openfgav1.TupleKey, len(tupleSlice))
	for idx, tuple := range tupleSlice {
		tuples[strconv.Itoa(idx)] = tuple
	}

	response, err := server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	for _, resp := range response {
		if resp.Authorized {
			return nil
		}
	}

	return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subjects are not authorized for requested access")
}

func (server *Server) CheckWithTupleCreationWithoutClaims(ctx context.Context, orgID valuer.UUID, _ authtypes.Relation, _ authtypes.Typeable, _ []authtypes.Selector, roleSelectors []authtypes.Selector) error {
	subject, err := authtypes.NewSubject(authtypes.TypeableAnonymous, authtypes.AnonymousUser.String(), orgID, nil)
	if err != nil {
		return err
	}

	tupleSlice, err := authtypes.TypeableRole.Tuples(subject, authtypes.RelationAssignee, roleSelectors, orgID)
	if err != nil {
		return err
	}

	// Convert slice to map with generated IDs for internal use
	tuples := make(map[string]*openfgav1.TupleKey, len(tupleSlice))
	for idx, tuple := range tupleSlice {
		tuples[strconv.Itoa(idx)] = tuple
	}

	response, err := server.BatchCheck(ctx, tuples)
	if err != nil {
		return err
	}

	for _, resp := range response {
		if resp.Authorized {
			return nil
		}
	}

	return errors.Newf(errors.TypeForbidden, authtypes.ErrCodeAuthZForbidden, "subjects are not authorized for requested access")
}

func (server *Server) Write(ctx context.Context, additions []*openfgav1.TupleKey, deletions []*openfgav1.TupleKey) error {
	if len(additions) == 0 && len(deletions) == 0 {
		return nil
	}

	storeID, modelID := server.getStoreIDandModelID()
	deletionTuplesWithoutCondition := make([]*openfgav1.TupleKeyWithoutCondition, len(deletions))
	for idx, tuple := range deletions {
		deletionTuplesWithoutCondition[idx] = &openfgav1.TupleKeyWithoutCondition{User: tuple.User, Object: tuple.Object, Relation: tuple.Relation}
	}

	_, err := server.openfgaServer.Write(ctx, &openfgav1.WriteRequest{
		StoreId:              storeID,
		AuthorizationModelId: modelID,
		Writes: func() *openfgav1.WriteRequestWrites {
			if len(additions) == 0 {
				return nil
			}
			return &openfgav1.WriteRequestWrites{
				TupleKeys:   additions,
				OnDuplicate: "ignore",
			}
		}(),
		Deletes: func() *openfgav1.WriteRequestDeletes {
			if len(deletionTuplesWithoutCondition) == 0 {
				return nil
			}
			return &openfgav1.WriteRequestDeletes{
				TupleKeys: deletionTuplesWithoutCondition,
				OnMissing: "ignore",
			}
		}(),
	})

	return err
}

func (server *Server) ListObjects(ctx context.Context, subject string, relation authtypes.Relation, typeable authtypes.Typeable) ([]*authtypes.Object, error) {
	storeID, modelID := server.getStoreIDandModelID()
	response, err := server.openfgaServer.ListObjects(ctx, &openfgav1.ListObjectsRequest{
		StoreId:              storeID,
		AuthorizationModelId: modelID,
		User:                 subject,
		Relation:             relation.StringValue(),
		Type:                 typeable.Type().StringValue(),
	})
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, authtypes.ErrCodeAuthZUnavailable, "cannot list objects for subject %s with relation %s for type %s", subject, relation.StringValue(), typeable.Type().StringValue())
	}

	return authtypes.MustNewObjectsFromStringSlice(response.Objects), nil
}

func (server *Server) getOrCreateStore(ctx context.Context, name string) (string, error) {
	stores, err := server.openfgaServer.ListStores(ctx, &openfgav1.ListStoresRequest{})
	if err != nil {
		return "", err
	}

	for _, store := range stores.GetStores() {
		if store.GetName() == name {
			return store.Id, nil
		}
	}

	store, err := server.openfgaServer.CreateStore(ctx, &openfgav1.CreateStoreRequest{Name: name})
	if err != nil {
		return "", err
	}

	return store.Id, nil
}

func (server *Server) getOrCreateModel(ctx context.Context, storeID string) (string, error) {
	schema, err := openfgapkgtransformer.TransformModuleFilesToModel(server.openfgaSchema, "1.1")
	if err != nil {
		return "", err
	}

	authorisationModels, err := server.openfgaServer.ReadAuthorizationModels(ctx, &openfgav1.ReadAuthorizationModelsRequest{StoreId: storeID})
	if err != nil {
		return "", err
	}

	for _, authModel := range authorisationModels.GetAuthorizationModels() {
		equal, err := server.isModelEqual(schema, authModel)
		if err != nil {
			return "", err
		}
		if equal {
			return authModel.Id, nil
		}
	}

	authorizationModel, err := server.openfgaServer.WriteAuthorizationModel(ctx, &openfgav1.WriteAuthorizationModelRequest{
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
func (server *Server) isModelEqual(expected *openfgav1.AuthorizationModel, actual *openfgav1.AuthorizationModel) (bool, error) {
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

func (server *Server) getStoreIDandModelID() (string, string) {
	server.mtx.RLock()
	defer server.mtx.RUnlock()

	storeID := server.storeID
	modelID := server.modelID

	return storeID, modelID
}
