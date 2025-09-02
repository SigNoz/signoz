package store

import (
	"context"

	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	openfgapkgserver "github.com/openfga/openfga/pkg/server"
)

type API interface {
	GetOrCreate(context.Context, string) (string, error)
}

type api struct {
	openfgaserver *openfgapkgserver.Server
}

func NewAPI(server *openfgapkgserver.Server) API {
	return &api{
		openfgaserver: server,
	}
}

func (api *api) GetOrCreate(ctx context.Context, name string) (string, error) {
	stores, err := api.openfgaserver.ListStores(ctx, &openfgav1.ListStoresRequest{})
	if err != nil {
		return "", err
	}

	for _, store := range stores.GetStores() {
		if store.GetName() == name {
			return store.Id, nil
		}
	}

	store, err := api.openfgaserver.CreateStore(ctx, &openfgav1.CreateStoreRequest{Name: name})
	if err != nil {
		return "", err
	}

	return store.Id, nil
}
