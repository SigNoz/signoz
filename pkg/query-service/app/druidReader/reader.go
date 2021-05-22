package druidReader

import (
	"go.signoz.io/query-service/druidQuery"
	"go.signoz.io/query-service/model"
)

type DruidReader struct {
	Client
	SqlClient
}

func NewSpanReader() {
	initialize()
}
func initialize() {

}

func (druid *Druid) GetServices(client, query *model.GetServicesParams) {
	return druidQuery.GetServices(druid.sqlClient, query)
}
