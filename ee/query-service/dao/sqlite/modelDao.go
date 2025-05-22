package sqlite

import (
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type modelDao struct {
	sqlStore sqlstore.SQLStore
}

// InitDB creates and extends base model DB repository
func NewModelDao(sqlStore sqlstore.SQLStore) *modelDao {
	return &modelDao{sqlStore: sqlStore}
}
