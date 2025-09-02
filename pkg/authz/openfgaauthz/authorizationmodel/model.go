package authorizationmodel

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authz/openfgaauthz/schema"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgtransformer "github.com/openfga/language/pkg/go/transformer"
	openfgapkgserver "github.com/openfga/openfga/pkg/server"
	"google.golang.org/protobuf/encoding/protojson"
)

type API interface {
	// GetOrCreate gets the authorizationModel if it exists for the given storeID else creates the authorizationModel based on the latest model present in /schema directory
	GetOrCreate(context.Context, string) (string, error)
	// Equal checks for the equality for two different authorizationModels
	Equal(*openfgav1.AuthorizationModel, *openfgav1.AuthorizationModel) (bool, error)
}

type api struct {
	openfgaserver *openfgapkgserver.Server
}

func NewAPI(server *openfgapkgserver.Server) API {
	return &api{
		openfgaserver: server,
	}
}

func (api *api) GetOrCreate(ctx context.Context, storeID string) (string, error) {
	schema, err := openfgapkgtransformer.TransformModuleFilesToModel(schema.Modules, "1.1")
	if err != nil {
		return "", err
	}

	authorisationModels, err := api.openfgaserver.ReadAuthorizationModels(ctx, &openfgav1.ReadAuthorizationModelsRequest{StoreId: storeID})
	if err != nil {
		return "", err
	}

	for _, authModel := range authorisationModels.GetAuthorizationModels() {
		equal, err := api.Equal(schema, authModel)
		if err != nil {
			return "", err
		}
		if equal {
			return authModel.Id, nil
		}
	}

	authorizationModel, err := api.openfgaserver.WriteAuthorizationModel(ctx, &openfgav1.WriteAuthorizationModelRequest{
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
func (api *api) Equal(expected *openfgav1.AuthorizationModel, actual *openfgav1.AuthorizationModel) (bool, error) {
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
