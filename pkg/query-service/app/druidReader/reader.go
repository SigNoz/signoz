package druidReader

import (
	"context"
	"os"

	"go.signoz.io/query-service/druidQuery"
	"go.signoz.io/query-service/godruid"
	"go.signoz.io/query-service/model"
)

type DruidReader struct {
	Client    *godruid.Client
	SqlClient *druidQuery.SqlClient
}

func NewReader() *DruidReader {

	initialize()
	druidClientUrl := os.Getenv("DruidClientUrl")

	client := godruid.Client{
		Url:   druidClientUrl,
		Debug: true,
	}

	sqlClient := druidQuery.SqlClient{
		Url:   druidClientUrl,
		Debug: true,
	}
	return &DruidReader{
		Client:    &client,
		SqlClient: &sqlClient,
	}

}

func initialize() {

}

func (druid *DruidReader) GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error) {
	return druidQuery.GetServiceOverview(druid.SqlClient, query)
}

func (druid *DruidReader) GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, error) {
	return druidQuery.GetServices(druid.SqlClient, query)
}

func (druid *DruidReader) SearchSpans(ctx context.Context, query *model.SpanSearchParams) (*[]model.SearchSpansResult, error) {
	return druidQuery.SearchSpans(druid.Client, query)
}
