package interfaces

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/model/metrics_explorer"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/querycache"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
)

type Reader interface {
	GetInstantQueryMetricsResult(ctx context.Context, query *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError)
	GetTopLevelOperations(ctx context.Context, start, end time.Time, services []string) (*map[string][]string, *model.ApiError)
	GetEntryPointOperations(ctx context.Context, query *model.GetTopOperationsParams) (*[]model.TopOperationsItem, error)
	GetServices(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceItem, *model.ApiError)
	GetTopOperations(ctx context.Context, query *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError)
	GetUsage(ctx context.Context, query *model.GetUsageParams) (*[]model.UsageItem, error)
	GetServicesList(ctx context.Context) (*[]string, error)
	GetDependencyGraph(ctx context.Context, query *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error)

	GetTTL(ctx context.Context, orgID string, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError)
	GetCustomRetentionTTL(ctx context.Context, orgID string) (*model.GetCustomRetentionTTLResponse, error)

	// GetDisks returns a list of disks configured in the underlying DB. It is supported by
	// clickhouse only.
	GetDisks(ctx context.Context) (*[]model.DiskItem, *model.ApiError)
	GetTraceAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error)
	GetTraceAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error)
	GetTraceAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error)
	GetSpanAttributeKeysByNames(ctx context.Context, names []string) (map[string]v3.AttributeKey, error)

	ListErrors(ctx context.Context, params *model.ListErrorsParams) (*[]model.Error, *model.ApiError)
	CountErrors(ctx context.Context, params *model.CountErrorsParams) (uint64, *model.ApiError)
	GetErrorFromErrorID(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	GetErrorFromGroupID(ctx context.Context, params *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError)
	GetNextPrevErrorIDs(ctx context.Context, params *model.GetErrorParams) (*model.NextPrevErrorIDs, *model.ApiError)

	// Search Interfaces
	SearchTraces(ctx context.Context, params *model.SearchTracesParams) (*[]model.SearchSpansResult, error)
	GetWaterfallSpansForTraceWithMetadata(ctx context.Context, orgID valuer.UUID, traceID string, req *model.GetWaterfallSpansForTraceWithMetadataParams) (*model.GetWaterfallSpansForTraceWithMetadataResponse, error)
	GetFlamegraphSpansForTrace(ctx context.Context, orgID valuer.UUID, traceID string, req *model.GetFlamegraphSpansForTraceParams) (*model.GetFlamegraphSpansForTraceResponse, error)

	// Setter Interfaces
	SetTTL(ctx context.Context, orgID string, ttlParams *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError)
	SetTTLV2(ctx context.Context, orgID string, params *model.CustomRetentionTTLParams) (*model.CustomRetentionTTLResponse, error)

	FetchTemporality(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]map[v3.Temporality]bool, error)
	GetMetricAggregateAttributes(ctx context.Context, orgID valuer.UUID, req *v3.AggregateAttributeRequest, skipSignozMetrics bool) (*v3.AggregateAttributeResponse, error)
	GetMeterAggregateAttributes(ctx context.Context, orgID valuer.UUID, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error)
	GetMetricAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error)
	GetMeterAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error)
	GetMetricAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error)

	// Returns `MetricStatus` for latest received metric among `metricNames`. Useful for status calculations
	GetLatestReceivedMetric(
		ctx context.Context, metricNames []string, labelValues map[string]string,
	) (*model.MetricStatus, *model.ApiError)

	// QB V3 metrics/traces/logs
	GetTimeSeriesResultV3(ctx context.Context, query string) ([]*v3.Series, error)
	GetListResultV3(ctx context.Context, query string) ([]*v3.Row, error)
	// Logs
	GetLogFields(ctx context.Context) (*model.GetFieldsResponse, *model.ApiError)
	GetLogFieldsFromNames(ctx context.Context, fieldNames []string) (*model.GetFieldsResponse, *model.ApiError)
	UpdateLogField(ctx context.Context, field *model.UpdateField) *model.ApiError
	GetLogAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error)
	GetLogAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error)
	GetLogAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error)
	GetQBFilterSuggestionsForLogs(
		ctx context.Context,
		req *v3.QBFilterSuggestionsRequest,
	) (*v3.QBFilterSuggestionsResponse, *model.ApiError)

	QueryDashboardVars(ctx context.Context, query string) (*model.DashboardVar, error)
	CheckClickHouse(ctx context.Context) error

	GetMetricMetadata(context.Context, valuer.UUID, string, string) (*v3.MetricMetadataResponse, error)

	AddRuleStateHistory(ctx context.Context, ruleStateHistory []model.RuleStateHistory) error
	GetOverallStateTransitions(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.ReleStateItem, error)
	ReadRuleStateHistoryByRuleID(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*model.RuleStateTimeline, error)
	GetTotalTriggers(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (uint64, error)
	GetTriggersByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error)
	GetAvgResolutionTime(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (float64, error)
	GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error)
	ReadRuleStateHistoryTopContributorsByRuleID(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.RuleStateHistoryContributor, error)
	GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]model.RuleStateHistory, error)

	GetMinAndMaxTimestampForTraceID(ctx context.Context, traceID []string) (int64, int64, error)

	// Query Progress tracking helpers.
	ReportQueryStartForProgressTracking(queryId string) (reportQueryFinished func(), err *model.ApiError)
	SubscribeToQueryProgress(queryId string) (<-chan model.QueryProgress, func(), *model.ApiError)

	GetCountOfThings(ctx context.Context, query string) (uint64, error)

	//trace
	GetTraceFields(ctx context.Context) (*model.GetFieldsResponse, *model.ApiError)
	UpdateTraceField(ctx context.Context, field *model.UpdateField) *model.ApiError

	GetAllMetricFilterAttributeValues(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError)
	GetAllMetricFilterUnits(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError)
	GetAllMetricFilterTypes(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError)
	GetAllMetricFilterAttributeKeys(ctx context.Context, req *metrics_explorer.FilterKeyRequest) (*[]v3.AttributeKey, *model.ApiError)

	GetMetricsDataPoints(ctx context.Context, metricName string) (uint64, *model.ApiError)
	GetMetricsLastReceived(ctx context.Context, metricName string) (int64, *model.ApiError)
	GetTotalTimeSeriesForMetricName(ctx context.Context, metricName string) (uint64, *model.ApiError)
	GetActiveTimeSeriesForMetricName(ctx context.Context, metricName string, duration time.Duration) (uint64, *model.ApiError)
	GetAttributesForMetricName(ctx context.Context, metricName string, start, end *int64, set *v3.FilterSet) (*[]metrics_explorer.Attribute, *model.ApiError)

	ListSummaryMetrics(ctx context.Context, orgID valuer.UUID, req *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError)

	GetMetricsTimeSeriesPercentage(ctx context.Context, request *metrics_explorer.TreeMapMetricsRequest) (*[]metrics_explorer.TreeMapResponseItem, *model.ApiError)
	GetMetricsSamplesPercentage(ctx context.Context, req *metrics_explorer.TreeMapMetricsRequest) (*[]metrics_explorer.TreeMapResponseItem, *model.ApiError)

	GetNameSimilarity(ctx context.Context, req *metrics_explorer.RelatedMetricsRequest) (map[string]metrics_explorer.RelatedMetricsScore, *model.ApiError)
	GetAttributeSimilarity(ctx context.Context, req *metrics_explorer.RelatedMetricsRequest) (map[string]metrics_explorer.RelatedMetricsScore, *model.ApiError)

	GetMetricsAllResourceAttributes(ctx context.Context, start int64, end int64) (map[string]uint64, *model.ApiError)
	GetInspectMetricsFingerprints(ctx context.Context, attributes []string, req *metrics_explorer.InspectMetricsRequest) ([]string, *model.ApiError)
	GetInspectMetrics(ctx context.Context, req *metrics_explorer.InspectMetricsRequest, fingerprints []string) (*metrics_explorer.InspectMetricsResponse, *model.ApiError)

	DeleteMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricName string) *model.ApiError
	UpdateMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *model.UpdateMetricsMetadata) *model.ApiError
	GetUpdatedMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]*model.UpdateMetricsMetadata, *model.ApiError)

	CheckForLabelsInMetric(ctx context.Context, metricName string, labels []string) (bool, *model.ApiError)
	GetNormalizedStatus(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]bool, error)
}

type Querier interface {
	QueryRange(context.Context, valuer.UUID, *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error)

	// test helpers
	QueriesExecuted() []string
	TimeRanges() [][]int
}

type QueryCache interface {
	FindMissingTimeRanges(orgID valuer.UUID, start, end int64, step int64, cacheKey string) []querycache.MissInterval
	FindMissingTimeRangesV2(orgID valuer.UUID, start, end int64, step int64, cacheKey string) []querycache.MissInterval
	MergeWithCachedSeriesData(orgID valuer.UUID, cacheKey string, newData []querycache.CachedSeriesData) []querycache.CachedSeriesData
	StoreSeriesInCache(orgID valuer.UUID, cacheKey string, series []querycache.CachedSeriesData)
	MergeWithCachedSeriesDataV2(orgID valuer.UUID, cacheKey string, series []querycache.CachedSeriesData) []querycache.CachedSeriesData
}
