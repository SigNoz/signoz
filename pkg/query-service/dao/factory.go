package dao

import (
	"fmt"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao/interfaces"
	"go.signoz.io/query-service/dao/sqlite"
)

func FactoryDao(engine string) (*interfaces.ModelDao, error) {
	var i interfaces.ModelDao
	var err error

	switch engine {
	case "sqlite":
		i, err = sqlite.InitDB(constants.RELATIONAL_DATASOURCE_PATH)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("RelationalDB type: %s is not supported in query service", engine)
	}

	return &i, nil
}
