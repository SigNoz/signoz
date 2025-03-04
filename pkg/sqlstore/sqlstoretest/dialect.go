package sqlstoretest

import (
	"context"

	"github.com/uptrace/bun"
)

type TestDialect struct {
}

func (dialect *TestDialect) MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *TestDialect) MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *TestDialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	return "", nil
}

func (dialect *TestDialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
	return false, nil
}
