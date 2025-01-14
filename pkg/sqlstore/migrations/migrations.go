package migrations

import (
	"context"
	"database/sql"
	"errors"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

var (
	ErrNoExecute = errors.New("no execute")
)

func New(
	ctx context.Context,
	settings factory.ProviderSettings,
	config sqlstore.Config,
	factories factory.NamedMap[factory.ProviderFactory[sqlstore.Migration, sqlstore.Config]],
) (*migrate.Migrations, error) {
	migrations := migrate.NewMigrations()

	for _, factory := range factories.GetInOrder() {
		migration, err := factory.New(ctx, settings, config)
		if err != nil {
			return nil, err
		}

		err = migration.Register(migrations)
		if err != nil {
			return nil, err
		}
	}

	return migrations, nil
}

func WrapIfNotExists(ctx context.Context, db *bun.DB, table string, column string) func(q *bun.AddColumnQuery) *bun.AddColumnQuery {
	return func(q *bun.AddColumnQuery) *bun.AddColumnQuery {
		if db.Dialect().Name() != dialect.SQLite {
			return q.IfNotExists()
		}

		var result string
		err := db.
			NewSelect().
			ColumnExpr("name").
			Table("pragma_table_info").
			Where("arg = ?", table).
			Where("name = ?", column).
			Scan(ctx, &result)
		if err != nil {
			if err == sql.ErrNoRows {
				return q
			}
			return q.Err(err)
		}

		return q.Err(ErrNoExecute)
	}
}
