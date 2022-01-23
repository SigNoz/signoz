package app

import (
	"context"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
	"go.signoz.io/query-service/model"
)

type Reader interface {
	GetChannel(id string) (*model.ChannelItem, *model.ApiError)
	GetChannels() (*[]model.ChannelItem, *model.ApiError)
	DeleteChannel(id string) *model.ApiError
	CreateChannel(receiver *model.Receiver) (*model.Receiver, *model.ApiError)
	EditChannel(receiver *model.Receiver, id string) (*model.Receiver, *model.ApiError)

	GetRule(id string) (*model.RuleResponseItem, *model.ApiError)
	ListRulesFromProm() (*model.AlertDiscovery, *model.ApiError)
	CreateRule(alert string) *model.ApiError
	EditRule(alert string, id string) *model.ApiError
	DeleteRule(id string) *model.ApiError

	GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error)
	GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, error)
	// GetApplicationPercentiles(ctx context.Context, query *model.ApplicationPercentileParams) ([]godruid.Timeseries, error)
	GetServiceDBOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceDBOverviewItem, error)
	GetServiceExternalAvgDuration(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetServiceExternalErrors(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetServiceExternal(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetTopEndpoints(ctx context.Context, query *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, error)
	GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error)
	GetOperations(ctx context.Context, serviceName string) (*[]string, error)
	GetTags(ctx context.Context, serviceName string) (*[]model.TagItem, error)
	GetServicesList(ctx context.Context) (*[]string, error)
	GetServiceMapDependencies(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error)
	GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError)
	GetErrors(ctx context.Context, params *model.GetErrorsParams) (*[]model.Error, *model.ApiError)
	GetErrorForId(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	GetErrorForType(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	// Search Interfaces
	SearchSpansAggregate(ctx context.Context, queryParams *model.SpanSearchAggregatesParams) ([]model.SpanSearchAggregatesResponseItem, error)
	SearchSpans(ctx context.Context, query *model.SpanSearchParams) (*[]model.SearchSpansResult, error)
	SearchTraces(ctx context.Context, traceID string) (*[]model.SearchSpansResult, error)

	// Setter Interfaces
	SetTTL(ctx context.Context, ttlParams *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError)
}
