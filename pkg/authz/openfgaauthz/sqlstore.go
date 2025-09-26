package openfgaauthz

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/openfga/openfga/pkg/storage"
	"github.com/openfga/openfga/pkg/storage/postgres"
	"github.com/openfga/openfga/pkg/storage/sqlcommon"
	"github.com/openfga/openfga/pkg/storage/sqlite"
)

func NewSQLStore(sqlstore sqlstore.SQLStore) (storage.OpenFGADatastore, error) {
	switch sqlstore.BunDB().Dialect().Name().String() {
	case "sqlite":
		return sqlite.NewWithDB(sqlstore.SQLDB(), &sqlcommon.Config{
			MaxTuplesPerWriteField: 100,
			MaxTypesPerModelField:  100,
		})
	case "pg":
		return postgres.NewWithDB(sqlstore.SQLDB(), nil, &sqlcommon.Config{
			MaxTuplesPerWriteField: 100,
			MaxTypesPerModelField:  100,
		})
	}
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid store type: %s", sqlstore.BunDB().Dialect().Name().String())
}
