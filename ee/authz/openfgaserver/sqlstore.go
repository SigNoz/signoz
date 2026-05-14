package openfgaserver

import (
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/openfga/openfga/pkg/storage"
	"github.com/openfga/openfga/pkg/storage/postgres"
	"github.com/openfga/openfga/pkg/storage/sqlcommon"
	"github.com/openfga/openfga/pkg/storage/sqlite"
)

func NewSQLStore(store sqlstore.SQLStore, config authz.Config) (storage.OpenFGADatastore, error) {
	switch store.BunDB().Dialect().Name().String() {
	case "sqlite":
		return sqlite.NewWithDB(store.SQLDB(), &sqlcommon.Config{
			MaxTuplesPerWriteField: config.OpenFGA.MaxTuplesPerWrite,
			MaxTypesPerModelField:  100,
		})
	case "pg":
		pgStore, ok := store.(postgressqlstore.Pooler)
		if !ok {
			panic(errors.New(errors.TypeInternal, errors.CodeInternal, "postgressqlstore should implement Pooler"))
		}

		return postgres.NewWithDB(pgStore.Pool(), nil, &sqlcommon.Config{
			MaxTuplesPerWriteField: config.OpenFGA.MaxTuplesPerWrite,
			MaxTypesPerModelField:  100,
		})
	}
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid store type: %s", store.BunDB().Dialect().Name().String())
}
