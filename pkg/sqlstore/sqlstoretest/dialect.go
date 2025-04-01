package sqlstoretest

import (
	"context"

	"github.com/uptrace/bun"
)

type dialect struct {
}

func (dialect *dialect) MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *dialect) MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *dialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	return "", nil
}

func (dialect *dialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
	return false, nil
}

func (dialect *dialect) RenameColumn(ctx context.Context, bun bun.IDB, table string, oldColumnName string, newColumnName string) (bool, error) {
	return true, nil
}

func (dialect *dialect) RenameTableAndModifyModel(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, cb func(context.Context) error) error {
	return nil
}

func (dialect *dialect) AddNotNullDefaultToColumn(ctx context.Context, bun bun.IDB, table string, column, columnType, defaultValue string) error {
	return nil
}
