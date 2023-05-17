package dao

import (
	"fmt"

	"go.signoz.io/signoz/ee/query-service/dao/sqlite"
)

func InitDao(engine, path string) (ModelDao, error) {

	switch engine {
	case "sqlite":
		return sqlite.InitDB(path)
	default:
		return nil, fmt.Errorf("qsdb type: %s is not supported in query service", engine)
	}

}
