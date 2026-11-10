package metricsexplorertypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MetricOrderBy represents the order-by field for metrics queries.
type MetricOrderBy struct {
	valuer.String
}

var (
	OrderByTimeSeries = MetricOrderBy{valuer.NewString("timeseries")}
	OrderBySamples    = MetricOrderBy{valuer.NewString("samples")}
)

// TreemapMode indicates which treemap variant the caller requests.
type TreemapMode struct {
	valuer.String
}

var (
	// TreemapModeTimeSeries represents the treemap based on timeseries counts.
	TreemapModeTimeSeries = TreemapMode{valuer.NewString("timeseries")}
	// TreemapModeSamples represents the treemap based on sample counts.
	TreemapModeSamples = TreemapMode{valuer.NewString("samples")}
)

func (TreemapMode) Enum() []any {
	return []any{
		TreemapModeTimeSeries,
		TreemapModeSamples,
	}
}

// StatsRequest represents the payload accepted by the metrics stats endpoint.
type StatsRequest struct {
	Filter  *qbtypes.Filter  `json:"filter,omitempty" description:"Query builder filter over metric attributes, for example host.name = 'web-1'. A bare word matches the metric name. Omitting it applies no restriction, but metrics whose name starts with signoz are always excluded."`
	Start   int64            `json:"start" required:"true" description:"Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end."`
	End     int64            `json:"end" required:"true" description:"End of the time range as a Unix timestamp in milliseconds. Must be greater than start."`
	Limit   int              `json:"limit" required:"true" description:"Maximum number of metrics to return, between 1 and 5000."`
	Offset  int              `json:"offset" description:"Number of metrics to skip for pagination. Must not be negative; defaults to 0."`
	OrderBy *qbtypes.OrderBy `json:"orderBy,omitempty" description:"Sort order; key.name is timeseries or samples, direction is asc or desc. Defaults to samples descending."`
}

// Validate ensures StatsRequest contains acceptable values.
func (req *StatsRequest) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid start time %d: start must be greater than 0",
			req.Start,
		)
	}

	if req.End <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid end time %d: end must be greater than 0",
			req.End,
		)
	}

	if req.Start >= req.End {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time range: start (%d) must be less than end (%d)",
			req.Start,
			req.End,
		)
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	if req.Offset < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "offset cannot be negative")
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *StatsRequest) UnmarshalJSON(data []byte) error {
	type raw StatsRequest
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = StatsRequest(decoded)
	return req.Validate()
}

// Stat represents the summary information returned per metric.
type Stat struct {
	MetricName  string           `json:"metricName" required:"true" description:"The name of the metric."`
	Description string           `json:"description" required:"true" description:"Human-readable description from the metric metadata; empty when none was reported."`
	MetricType  metrictypes.Type `json:"type" required:"true" description:"The metric type, such as gauge, sum, histogram, summary or exponentialhistogram."`
	MetricUnit  string           `json:"unit" required:"true" description:"The unit reported in the metric metadata, for example ms or By; empty when none was reported."`
	TimeSeries  uint64           `json:"timeseries" required:"true" description:"Number of distinct time series active in the time range, approximate: it can include series last active shortly before start."`
	Samples     uint64           `json:"samples" required:"true" description:"Number of samples (data points) ingested for the metric in the requested time range."`
}

// StatsResponse represents the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []Stat `json:"metrics" required:"true" nullable:"true" description:"One entry per metric on the requested page, in the requested order."`
	Total   uint64 `json:"total" required:"true" description:"Total number of metrics matching the filter across all pages."`
}

type MetricMetadata struct {
	Description string                  `json:"description" required:"true" description:"Human-readable description of the metric; empty when none was reported."`
	MetricType  metrictypes.Type        `json:"type" required:"true" description:"The metric type, such as gauge, sum, histogram, summary or exponentialhistogram."`
	MetricUnit  string                  `json:"unit" required:"true" description:"The unit of the metric values, for example ms or By; empty when none was reported."`
	Temporality metrictypes.Temporality `json:"temporality" required:"true" description:"Aggregation temporality of the metric: cumulative, delta or unspecified."`
	IsMonotonic bool                    `json:"isMonotonic" required:"true" description:"True when the metric is a monotonically increasing Sum (a counter)."`
}

// MarshalBinary implements cachetypes.Cacheable interface.
func (m *MetricMetadata) MarshalBinary() ([]byte, error) {
	return json.Marshal(m)
}

// UnmarshalBinary implements cachetypes.Cacheable interface.
func (m *MetricMetadata) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, m)
}

// UpdateMetricMetadataRequest represents the payload for updating metric metadata.
type UpdateMetricMetadataRequest struct {
	MetricName  string                  `json:"metricName" required:"true" description:"The name of the metric whose metadata to replace."`
	Type        metrictypes.Type        `json:"type" required:"true" description:"The metric type to store, such as gauge, sum, histogram, summary or exponentialhistogram."`
	Description string                  `json:"description" required:"true" description:"Human-readable description of the metric."`
	Unit        string                  `json:"unit" required:"true" description:"The unit of the metric values, for example ms or By."`
	Temporality metrictypes.Temporality `json:"temporality" required:"true" description:"Aggregation temporality to store. Required as delta or cumulative when type is sum, histogram or exponentialhistogram; gauges are stored as unspecified and summaries as cumulative whatever is sent. A non-monotonic cumulative sum is stored as a gauge."`
	IsMonotonic bool                    `json:"isMonotonic" required:"true" description:"Whether the metric is a monotonically increasing Sum (a counter)."`
}

// TreemapRequest represents the payload for the metrics treemap endpoint.
type TreemapRequest struct {
	Filter *qbtypes.Filter `json:"filter,omitempty" description:"Query builder filter over metric attributes, for example host.name = 'web-1'. A bare word matches the metric name. Omitting it applies no restriction, but metrics whose name starts with signoz are always excluded."`
	Start  int64           `json:"start" required:"true" description:"Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end."`
	End    int64           `json:"end" required:"true" description:"End of the time range as a Unix timestamp in milliseconds. Must be greater than start."`
	Limit  int             `json:"limit" required:"true" description:"Maximum number of metrics to return, between 1 and 5000, ordered by percentage descending."`
	Mode   TreemapMode     `json:"mode" required:"true" description:"What each metric is sized by: timeseries counts distinct time series; samples counts ingested data points, ranked among a shortlist of the metrics with the most time series. Only the matching response array is populated."`
}

// Validate enforces basic constraints on TreemapRequest.
func (req *TreemapRequest) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid start time %d: start must be greater than 0",
			req.Start,
		)
	}

	if req.End <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid end time %d: end must be greater than 0",
			req.End,
		)
	}

	if req.Start >= req.End {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time range: start (%d) must be less than end (%d)",
			req.Start,
			req.End,
		)
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	if req.Mode != TreemapModeSamples && req.Mode != TreemapModeTimeSeries {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid treemap mode %q: supported values are %q or %q",
			req.Mode,
			TreemapModeSamples,
			TreemapModeTimeSeries,
		)
	}

	return nil
}

// UnmarshalJSON validates treemap requests immediately after decoding.
func (req *TreemapRequest) UnmarshalJSON(data []byte) error {
	type raw TreemapRequest
	var decoded raw

	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}

	*req = TreemapRequest(decoded)
	return req.Validate()
}

// TreemapEntry represents each node in the treemap response.
type TreemapEntry struct {
	MetricName string  `json:"metricName" required:"true" description:"The name of the metric."`
	Percentage float64 `json:"percentage" required:"true" description:"Share of the total across all metrics in the time range, from 0 to 100."`
	TotalValue uint64  `json:"totalValue" required:"true" description:"Time series count or sample count for the metric, depending on the requested mode."`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries" required:"true" nullable:"true" description:"Entries sized by time series count; populated only when mode is timeseries."`
	Samples    []TreemapEntry `json:"samples" required:"true" nullable:"true" description:"Entries sized by sample count, chosen among the metrics with the most time series; populated only when mode is samples."`
}

// MetricAlert represents an alert associated with a metric.
type MetricAlert struct {
	AlertName string `json:"alertName" required:"true" description:"The name of the alert rule that queries the metric."`
	AlertID   string `json:"alertId" required:"true" description:"The id of the alert rule."`
}

// MetricAlertsResponse represents the response for metric alerts endpoint.
type MetricAlertsResponse struct {
	Alerts []MetricAlert `json:"alerts" required:"true" nullable:"true" description:"Alert rules whose queries reference the metric."`
}

// MetricDashboardPanelsResponse is the response for the v2 metric dashboards
// endpoint: the dashboard panels that reference the metric.
type MetricDashboardPanelsResponse struct {
	Dashboards []dashboardtypes.DashboardPanelRef `json:"dashboards" required:"true" nullable:"true" description:"One entry per dashboard panel whose query references the metric."`
}

// NewMetricDashboardPanelsResponse wraps the dashboard panels that reference a
// metric into the v2 API response.
func NewMetricDashboardPanelsResponse(refs []dashboardtypes.DashboardPanelRef) *MetricDashboardPanelsResponse {
	if refs == nil {
		refs = []dashboardtypes.DashboardPanelRef{}
	}

	return &MetricDashboardPanelsResponse{Dashboards: refs}
}

// MetricHighlightsResponse is the output structure for the metric highlights endpoint.
type MetricHighlightsResponse struct {
	DataPoints       uint64 `json:"dataPoints" required:"true" description:"Number of samples ingested for the metric over retained data."`
	LastReceived     uint64 `json:"lastReceived" required:"true" description:"Unix timestamp in milliseconds of the most recently received sample."`
	TotalTimeSeries  uint64 `json:"totalTimeSeries" required:"true" description:"Number of distinct time series for the metric over retained data."`
	ActiveTimeSeries uint64 `json:"activeTimeSeries" required:"true" description:"Number of distinct time series active in the last 120 minutes, approximate: a series that last reported early in that window can be missed."`
}

// MetricNameQuery represents the query parameters for endpoints that take a metric name.
type MetricNameQuery struct {
	MetricName string `query:"metricName" required:"true" description:"The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies)."`
}

// Validate ensures MetricNameQuery contains acceptable values.
func (q *MetricNameQuery) Validate() error {
	if q == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}
	if q.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	return nil
}

// MetricAttributesRequest represents the query parameters for the metric attributes endpoint.
type MetricAttributesRequest struct {
	MetricName string `query:"metricName" required:"true" description:"The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies)."`
	Start      *int64 `query:"start" description:"Start of the time range as a Unix timestamp in milliseconds."`
	End        *int64 `query:"end" description:"End of the time range as a Unix timestamp in milliseconds."`
}

// Validate ensures MetricAttributesRequest contains acceptable values.
func (req *MetricAttributesRequest) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}

	if req.Start != nil && req.End != nil {
		if *req.Start >= *req.End {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "start (%d) must be less than end (%d)", *req.Start, *req.End)
		}
	}

	return nil
}

// MetricAttribute represents a single attribute with its values and count.
type MetricAttribute struct {
	Key        string   `json:"key" required:"true" description:"The attribute (label) name."`
	Values     []string `json:"values" required:"true" nullable:"true" description:"Distinct values observed for the attribute, capped at 1000."`
	ValueCount uint64   `json:"valueCount" required:"true" description:"Total number of distinct values observed, which can exceed the length of values."`
}

// MetricAttributesResponse is the output structure for the metric attributes endpoint.
type MetricAttributesResponse struct {
	Attributes []MetricAttribute `json:"attributes" required:"true" nullable:"true" description:"Attributes of the metric, ordered by distinct value count descending."`
	TotalKeys  int64             `json:"totalKeys" required:"true" description:"Number of attributes returned."`
}

// ListMetricsParams represents the query parameters for the list metrics endpoint.
type ListMetricsParams struct {
	Start  *int64 `query:"start" description:"Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0; applied only when end is also set."`
	End    *int64 `query:"end" description:"End of the time range as a Unix timestamp in milliseconds. Must be greater than start; applied only when start is also set."`
	Limit  int    `query:"limit" description:"Maximum number of metric names to return. Defaults to 100; must not exceed 5000."`
	Search string `query:"searchText" description:"Case-insensitive substring to match against metric names."`
	Source string `query:"source" description:"Set to meter to list Cost Meter metrics instead of telemetry metrics."`
}

// Validate ensures ListMetricsParams contains acceptable values.
func (p *ListMetricsParams) Validate() error {
	if p.Start != nil && *p.Start <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be greater than 0")
	}
	if p.End != nil && *p.End <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "end must be greater than 0")
	}
	if p.Start != nil && p.End != nil && *p.Start >= *p.End {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start (%d) must be less than end (%d)", *p.Start, *p.End)
	}
	if p.Limit < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit cannot be negative")
	}
	if p.Limit == 0 {
		p.Limit = 100
	}
	if p.Limit > 5000 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must not exceed 5000")
	}
	return nil
}

// ListMetric represents a single metric with its metadata in the list metrics response.
type ListMetric struct {
	MetricName  string                  `json:"metricName" required:"true" description:"The name of the metric."`
	Description string                  `json:"description" required:"true" description:"Human-readable description from the metric metadata; empty when none was reported."`
	MetricType  metrictypes.Type        `json:"type" required:"true" description:"The metric type, such as gauge, sum, histogram, summary or exponentialhistogram."`
	MetricUnit  string                  `json:"unit" required:"true" description:"The unit reported in the metric metadata, for example ms or By; empty when none was reported."`
	Temporality metrictypes.Temporality `json:"temporality" required:"true" description:"Aggregation temporality of the metric: cumulative, delta or unspecified."`
	IsMonotonic bool                    `json:"isMonotonic" required:"true" description:"True when the metric is a monotonically increasing Sum (a counter)."`
}

// ListMetricsResponse represents the response for the list metrics endpoint.
type ListMetricsResponse struct {
	Metrics []ListMetric `json:"metrics" required:"true" nullable:"true" description:"Matching metrics with their metadata, ordered by name."`
}

// MetricsOnboardingResponse is the response for the lightweight metrics onboarding check.
type MetricsOnboardingResponse struct {
	HasMetrics bool `json:"hasMetrics" required:"true" description:"True when at least one metric not emitted by SigNoz itself has been ingested."`
}

// InspectMetricsRequest is the request for inspecting raw metric data points.
type InspectMetricsRequest struct {
	MetricName string          `json:"metricName" required:"true" description:"The name of the metric to inspect."`
	Start      int64           `json:"start" required:"true" description:"Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end."`
	End        int64           `json:"end" required:"true" description:"End of the time range as a Unix timestamp in milliseconds. At most 30 minutes after start."`
	Filter     *qbtypes.Filter `json:"filter,omitempty" description:"Query builder filter over the metric attributes, for example host.name = 'web-1'. Omitting it applies no attribute restriction; inspection returns at most 50 series either way."`
}

// Validate ensures the request is valid.
func (r *InspectMetricsRequest) Validate() error {
	if r.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}
	if r.Start <= 0 || r.End <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start and end must be positive")
	}
	if r.Start >= r.End {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "start must be less than end")
	}
	maxRange := int64(30 * 60 * 1000) // 30 minutes in milliseconds
	if r.End-r.Start > maxRange {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "time range must not exceed 30 minutes")
	}
	return nil
}

// InspectMetricsResponse is the response for the inspect metrics endpoint.
type InspectMetricsResponse struct {
	Series []*qbtypes.TimeSeries `json:"series" required:"true" nullable:"true" description:"Raw time series, at most 50, each with its labels and timestamp-value pairs."`
}
