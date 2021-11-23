package druidReader

import (
	"context"
	"fmt"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
	"go.signoz.io/query-service/druidQuery"
	"go.signoz.io/query-service/godruid"
	"go.signoz.io/query-service/model"
)

type DruidReader struct {
	Client    *godruid.Client
	SqlClient *druidQuery.SqlClient
	LocalDB   *sqlx.DB
}

func NewReader(localDB *sqlx.DB) *DruidReader {

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
		LocalDB:   localDB,
	}

}

func initialize() {

}

func (druid *DruidReader) GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {

	return nil, nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support metrics")}
}

func (druid *DruidReader) GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {

	return nil, nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support metrics")}
}

func (druid *DruidReader) DeleteChannel(id string) *model.ApiError {
	return &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support notification channel for alerts")}
}

func (druid *DruidReader) GetChannel(id string) (*model.ChannelItem, *model.ApiError) {
	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support notification channel for alerts")}
}
func (druid *DruidReader) GetChannels() (*[]model.ChannelItem, *model.ApiError) {
	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support notification channel for alerts")}
}
func (druid *DruidReader) CreateChannel(receiver *model.Receiver) (*model.Receiver, *model.ApiError) {

	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support notification channel for alerts")}

}
func (druid *DruidReader) EditChannel(receiver *model.Receiver, id string) (*model.Receiver, *model.ApiError) {

	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support notification channel for alerts")}

}

func (druid *DruidReader) ListRulesFromProm() (*model.AlertDiscovery, *model.ApiError) {

	res := model.AlertDiscovery{}
	return &res, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support getting rules for alerting")}
}
func (druid *DruidReader) GetRule(id string) (*model.RuleResponseItem, *model.ApiError) {

	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support getting rules for alerting")}
}
func (druid *DruidReader) CreateRule(alert string) *model.ApiError {

	return &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support setting rules for alerting")}
}
func (druid *DruidReader) EditRule(alert string, id string) *model.ApiError {

	return &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support editing rules for alerting")}
}
func (druid *DruidReader) DeleteRule(id string) *model.ApiError {

	return &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("Druid does not support deleting rules for alerting")}
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

func (druid *DruidReader) GetServiceDBOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceDBOverviewItem, error) {
	return druidQuery.GetServiceDBOverview(druid.SqlClient, query)
}

func (druid *DruidReader) GetServiceExternalAvgDuration(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {
	return druidQuery.GetServiceExternalAvgDuration(druid.SqlClient, query)
}

func (druid *DruidReader) GetServiceExternalErrors(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {
	return druidQuery.GetServiceExternalErrors(druid.SqlClient, query)
}

func (druid *DruidReader) GetServiceExternal(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error) {
	return druidQuery.GetServiceExternal(druid.SqlClient, query)
}

func (druid *DruidReader) GetTopEndpoints(ctx context.Context, query *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, error) {
	return druidQuery.GetTopEndpoints(druid.SqlClient, query)
}

func (druid *DruidReader) GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error) {
	return druidQuery.GetUsage(druid.SqlClient, query)
}

func (druid *DruidReader) GetOperations(ctx context.Context, serviceName string) (*[]string, error) {
	return druidQuery.GetOperations(druid.SqlClient, serviceName)
}

func (druid *DruidReader) GetTags(ctx context.Context, serviceName string) (*[]model.TagItem, error) {
	return druidQuery.GetTags(druid.SqlClient, serviceName)
}

func (druid *DruidReader) GetServicesList(ctx context.Context) (*[]string, error) {
	return druidQuery.GetServicesList(druid.SqlClient)
}

func (druid *DruidReader) SearchTraces(ctx context.Context, traceId string) (*[]model.SearchSpansResult, error) {
	return druidQuery.SearchTraces(druid.Client, traceId)
}

func (druid *DruidReader) GetServiceMapDependencies(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error) {
	return druidQuery.GetServiceMapDependencies(druid.SqlClient, query)
}
func (druid *DruidReader) SearchSpansAggregate(ctx context.Context, queryParams *model.SpanSearchAggregatesParams) ([]model.SpanSearchAggregatesResponseItem, error) {
	return druidQuery.SearchSpansAggregate(druid.Client, queryParams)
}

func (druid *DruidReader) SetTTL(_ context.Context, _ *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("druid does not support setting ttl configuration")}
}

func (druid *DruidReader) GetTTL(_ context.Context, _ *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {
	return nil, &model.ApiError{model.ErrorNotImplemented, fmt.Errorf("druid does not support setting ttl configuration")}
}
