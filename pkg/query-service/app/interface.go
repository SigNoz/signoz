package app

import (
	"context"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
	"go.signoz.io/query-service/model"
)

type Reader interface {
	GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, error)
	GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, error)
	// GetApplicationPercentiles(ctx context.Context, query *model.ApplicationPercentileParams) ([]godruid.Timeseries, error)
	SearchSpans(ctx context.Context, query *model.SpanSearchParams) (*[]model.SearchSpansResult, error)
	GetServiceDBOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceDBOverviewItem, error)
	GetServiceExternalAvgDuration(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetServiceExternalErrors(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetServiceExternal(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceExternalItem, error)
	GetTopEndpoints(ctx context.Context, query *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, error)
	GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error)
	GetOperations(ctx context.Context, serviceName string) (*[]string, error)
	GetTags(ctx context.Context, serviceName string) (*[]model.TagItem, error)
	GetServicesList(ctx context.Context) (*[]string, error)
	SearchTraces(ctx context.Context, traceID string) (*[]model.SearchSpansResult, error)
	GetServiceMapDependencies(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error)
	SearchSpansAggregate(ctx context.Context, queryParams *model.SpanSearchAggregatesParams) ([]model.SpanSearchAggregatesResponseItem, error)
}
