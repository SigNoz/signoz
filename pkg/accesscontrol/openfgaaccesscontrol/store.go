package openfgaaccesscontrol

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/openfga/openfga/pkg/storage"
	"github.com/openfga/openfga/pkg/storage/migrate"
	"github.com/openfga/openfga/pkg/storage/postgres"
	"github.com/openfga/openfga/pkg/storage/sqlcommon"
	"github.com/openfga/openfga/pkg/storage/sqlite"
)

type storeConfig struct {
	sqlstoreConfig sqlstore.Config
}

func NewStore(cfg storeConfig) (storage.OpenFGADatastore, error) {
	switch cfg.sqlstoreConfig.Provider {
	case "sqlite":
		err := migrate.RunMigrations(migrate.MigrationConfig{Engine: cfg.sqlstoreConfig.Provider, URI: "file:" + cfg.sqlstoreConfig.Sqlite.Path + "?_foreign_keys=true"})
		if err != nil {
			return nil, err
		}

		return sqlite.New("file:"+cfg.sqlstoreConfig.Sqlite.Path+"?_foreign_keys=true", &sqlcommon.Config{
			MaxTuplesPerWriteField: 100,
			MaxTypesPerModelField:  100,
		})
	case "postgres":
		err := migrate.RunMigrations(migrate.MigrationConfig{Engine: cfg.sqlstoreConfig.Provider, URI: cfg.sqlstoreConfig.Postgres.DSN})
		if err != nil {
			return nil, err
		}

		return postgres.New(cfg.sqlstoreConfig.Postgres.DSN, &sqlcommon.Config{
			MaxTuplesPerWriteField: 100,
			MaxTypesPerModelField:  100,
		})
	default:
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid store type: %s", cfg.sqlstoreConfig.Provider)
	}
}
