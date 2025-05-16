package sqlite

import (
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type modelDao struct {
	userModule user.Module
	sqlStore   sqlstore.SQLStore
}

// InitDB creates and extends base model DB repository
func NewModelDao(sqlStore sqlstore.SQLStore) *modelDao {
	userModule := impluser.NewModule(impluser.NewStore(sqlStore))
	return &modelDao{userModule: userModule, sqlStore: sqlStore}
}
