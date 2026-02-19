package metricsexplorertypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
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
	Filter  *qbtypes.Filter  `json:"filter,omitempty"`
	Start   int64            `json:"start" required:"true"`
	End     int64            `json:"end" required:"true"`
	Limit   int              `json:"limit" required:"true"`
	Offset  int              `json:"offset"`
	OrderBy *qbtypes.OrderBy `json:"orderBy,omitempty"`
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
	MetricName  string           `json:"metricName" required:"true"`
	Description string           `json:"description" required:"true"`
	MetricType  metrictypes.Type `json:"type" required:"true"`
	MetricUnit  string           `json:"unit" required:"true"`
	TimeSeries  uint64           `json:"timeseries" required:"true"`
	Samples     uint64           `json:"samples" required:"true"`
}

// StatsResponse represents the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []Stat `json:"metrics" required:"true" nullable:"true"`
	Total   uint64 `json:"total" required:"true"`
}

type MetricMetadata struct {
	Description string                  `json:"description" required:"true"`
	MetricType  metrictypes.Type        `json:"type" required:"true"`
	MetricUnit  string                  `json:"unit" required:"true"`
	Temporality metrictypes.Temporality `json:"temporality" required:"true"`
	IsMonotonic bool                    `json:"isMonotonic" required:"true"`
}

// MarshalBinary implements cachetypes.Cacheable interface
func (m *MetricMetadata) MarshalBinary() ([]byte, error) {
	return json.Marshal(m)
}

// UnmarshalBinary implements cachetypes.Cacheable interface
func (m *MetricMetadata) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, m)
}

// UpdateMetricMetadataRequest represents the payload for updating metric metadata.
type UpdateMetricMetadataRequest struct {
	MetricName  string                  `json:"metricName" required:"true"`
	Type        metrictypes.Type        `json:"type" required:"true"`
	Description string                  `json:"description" required:"true"`
	Unit        string                  `json:"unit" required:"true"`
	Temporality metrictypes.Temporality `json:"temporality" required:"true"`
	IsMonotonic bool                    `json:"isMonotonic" required:"true"`
}

// TreemapRequest represents the payload for the metrics treemap endpoint.
type TreemapRequest struct {
	Filter *qbtypes.Filter `json:"filter,omitempty"`
	Start  int64           `json:"start" required:"true"`
	End    int64           `json:"end" required:"true"`
	Limit  int             `json:"limit" required:"true"`
	Mode   TreemapMode     `json:"mode" required:"true"`
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
	MetricName string  `json:"metricName" required:"true"`
	Percentage float64 `json:"percentage" required:"true"`
	TotalValue uint64  `json:"totalValue" required:"true"`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries" required:"true" nullable:"true"`
	Samples    []TreemapEntry `json:"samples" required:"true" nullable:"true"`
}

// MetricAlert represents an alert associated with a metric.
type MetricAlert struct {
	AlertName string `json:"alertName" required:"true"`
	AlertID   string `json:"alertId" required:"true"`
}

// MetricAlertsResponse represents the response for metric alerts endpoint.
type MetricAlertsResponse struct {
	Alerts []MetricAlert `json:"alerts" required:"true" nullable:"true"`
}

// MetricDashboard represents a dashboard/widget referencing a metric.
type MetricDashboard struct {
	DashboardName string `json:"dashboardName" required:"true"`
	DashboardID   string `json:"dashboardId" required:"true"`
	WidgetID      string `json:"widgetId" required:"true"`
	WidgetName    string `json:"widgetName" required:"true"`
}

// MetricDashboardsResponse represents the response for metric dashboards endpoint.
type MetricDashboardsResponse struct {
	Dashboards []MetricDashboard `json:"dashboards" required:"true" nullable:"true"`
}

// MetricHighlightsResponse is the output structure for the metric highlights endpoint.
type MetricHighlightsResponse struct {
	DataPoints       uint64 `json:"dataPoints" required:"true"`
	LastReceived     uint64 `json:"lastReceived" required:"true"`
	TotalTimeSeries  uint64 `json:"totalTimeSeries" required:"true"`
	ActiveTimeSeries uint64 `json:"activeTimeSeries" required:"true"`
}

// MetricAttributesRequest represents the query parameters for the metric attributes endpoint.
type MetricAttributesRequest struct {
	MetricName string `json:"-"`
	Start      *int64 `query:"start"`
	End        *int64 `query:"end"`
}

// Validate ensures MetricAttributesRequest contains acceptable values.
func (req *MetricAttributesRequest) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
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
	Key        string   `json:"key" required:"true"`
	Values     []string `json:"values" required:"true" nullable:"true"`
	ValueCount uint64   `json:"valueCount" required:"true"`
}

// MetricAttributesResponse is the output structure for the metric attributes endpoint.
type MetricAttributesResponse struct {
	Attributes []MetricAttribute `json:"attributes" required:"true" nullable:"true"`
	TotalKeys  int64             `json:"totalKeys" required:"true"`
}

// ListMetricsParams represents the query parameters for the list metrics endpoint.
type ListMetricsParams struct {
	Start  *int64 `query:"start"`
	End    *int64 `query:"end"`
	Limit  int    `query:"limit"`
	Search string `query:"searchText"`
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
	MetricName  string                  `json:"metricName" required:"true"`
	Description string                  `json:"description" required:"true"`
	MetricType  metrictypes.Type        `json:"type" required:"true"`
	MetricUnit  string                  `json:"unit" required:"true"`
	Temporality metrictypes.Temporality `json:"temporality" required:"true"`
	IsMonotonic bool                    `json:"isMonotonic" required:"true"`
}

// ListMetricsResponse represents the response for the list metrics endpoint.
type ListMetricsResponse struct {
	Metrics []ListMetric `json:"metrics" required:"true" nullable:"true"`
}
