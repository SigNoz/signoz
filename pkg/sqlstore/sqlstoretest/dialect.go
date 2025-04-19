package sqlstoretest

import (
	"context"

	"github.com/uptrace/bun"
)

type dialect struct {
}

func (dialect *dialect) IntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *dialect) IntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *dialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	return "", nil
}

func (dialect *dialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
	return false, nil
}

func (dialect *dialect) AddColumn(ctx context.Context, bun bun.IDB, table string, column string, columnExpr string) error {
	return nil
}

func (dialect *dialect) RenameColumn(ctx context.Context, bun bun.IDB, table string, oldColumnName string, newColumnName string) (bool, error) {
	return true, nil
}

func (dialect *dialect) DropColumn(ctx context.Context, bun bun.IDB, table string, column string) error {
	return nil
}

func (dialect *dialect) RenameTableAndModifyModel(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, references []string, cb func(context.Context) error) error {
	return nil
}

func (dialect *dialect) AddNotNullDefaultToColumn(ctx context.Context, bun bun.IDB, table string, column, columnType, defaultValue string) error {
	return nil
}

func (dialect *dialect) UpdatePrimaryKey(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	return nil
}

func (dialect *dialect) AddPrimaryKey(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	return nil
}

func (dialect *dialect) IndexExists(ctx context.Context, bun bun.IDB, table string, index string) (bool, error) {
	return false, nil
}
