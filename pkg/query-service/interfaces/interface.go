package interfaces

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
	am "go.signoz.io/query-service/integrations/alertManager"
	"go.signoz.io/query-service/model"
)

type Reader interface {
	GetChannel(id string) (*model.ChannelItem, *model.ApiError)
	GetChannels() (*[]model.ChannelItem, *model.ApiError)
	DeleteChannel(id string) *model.ApiError
	CreateChannel(receiver *am.Receiver) (*am.Receiver, *model.ApiError)
	EditChannel(receiver *am.Receiver, id string) (*am.Receiver, *model.ApiError)

	GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetServiceOverview(ctx context.Context, query *model.GetServiceOverviewParams) (*[]model.ServiceOverviewItem, *model.ApiError)
	GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, *model.ApiError)
	GetTopEndpoints(ctx context.Context, query *model.GetTopEndpointsParams) (*[]model.TopEndpointsItem, *model.ApiError)
	GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error)
	GetServicesList(ctx context.Context) (*[]string, error)
	GetServiceMapDependencies(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error)
	GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError)

	// GetDisks returns a list of disks configured in the underlying DB. It is supported by
	// clickhouse only.
	GetDisks(ctx context.Context) (*[]model.DiskItem, *model.ApiError)
	GetSpanFilters(ctx context.Context, query *model.SpanFilterParams) (*model.SpanFiltersResponse, *model.ApiError)
	GetTagFilters(ctx context.Context, query *model.TagFilterParams) (*[]model.TagFilters, *model.ApiError)
	GetTagValues(ctx context.Context, query *model.TagFilterParams) (*[]model.TagValues, *model.ApiError)
	GetFilteredSpans(ctx context.Context, query *model.GetFilteredSpansParams) (*model.GetFilterSpansResponse, *model.ApiError)
	GetFilteredSpansAggregates(ctx context.Context, query *model.GetFilteredSpanAggregatesParams) (*model.GetFilteredSpansAggregatesResponse, *model.ApiError)

	GetErrors(ctx context.Context, params *model.GetErrorsParams) (*[]model.Error, *model.ApiError)
	GetErrorForId(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	GetErrorForType(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	// Search Interfaces
	SearchTraces(ctx context.Context, traceID string) (*[]model.SearchSpansResult, error)

	// Setter Interfaces
	SetTTL(ctx context.Context, ttlParams *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError)

	GetMetricAutocompleteMetricNames(ctx context.Context, matchText string, limit int) (*[]string, *model.ApiError)
	GetMetricAutocompleteTagKey(ctx context.Context, params *model.MetricAutocompleteTagParams) (*[]string, *model.ApiError)
	GetMetricAutocompleteTagValue(ctx context.Context, params *model.MetricAutocompleteTagParams) (*[]string, *model.ApiError)
	GetMetricResult(ctx context.Context, query string) ([]*model.Series, error)

	GetTotalSpans(ctx context.Context) (uint64, error)
	GetSpansInLastHeartBeatInterval(ctx context.Context) (uint64, error)
	GetTimeSeriesInfo(ctx context.Context) (map[string]interface{}, error)
	GetSamplesInfoInLastHeartBeatInterval(ctx context.Context) (uint64, error)

	// Connection needed for rules, not ideal but required
	GetConn() clickhouse.Conn
}
