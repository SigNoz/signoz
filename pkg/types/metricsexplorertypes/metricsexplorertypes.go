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

// StatsRequest represents the payload accepted by the metrics stats endpoint.
type StatsRequest struct {
	Filter  *qbtypes.Filter  `json:"filter,omitempty"`
	Start   int64            `json:"start"`
	End     int64            `json:"end"`
	Limit   int              `json:"limit"`
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
	MetricName  string           `json:"metricName"`
	Description string           `json:"description"`
	MetricType  metrictypes.Type `json:"type"`
	MetricUnit  string           `json:"unit"`
	TimeSeries  uint64           `json:"timeseries"`
	Samples     uint64           `json:"samples"`
}

// StatsResponse represents the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []Stat `json:"metrics"`
	Total   uint64 `json:"total"`
}

type MetricMetadata struct {
	Description string                  `json:"description"`
	MetricType  metrictypes.Type        `json:"type"`
	MetricUnit  string                  `json:"unit"`
	Temporality metrictypes.Temporality `json:"temporality"`
	IsMonotonic bool                    `json:"isMonotonic"`
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
	MetricName  string                  `json:"metricName"`
	Type        metrictypes.Type        `json:"type"`
	Description string                  `json:"description"`
	Unit        string                  `json:"unit"`
	Temporality metrictypes.Temporality `json:"temporality"`
	IsMonotonic bool                    `json:"isMonotonic"`
}

// TreemapRequest represents the payload for the metrics treemap endpoint.
type TreemapRequest struct {
	Filter *qbtypes.Filter `json:"filter,omitempty"`
	Start  int64           `json:"start"`
	End    int64           `json:"end"`
	Limit  int             `json:"limit"`
	Mode   TreemapMode     `json:"mode"`
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
	MetricName string  `json:"metricName"`
	Percentage float64 `json:"percentage"`
	TotalValue uint64  `json:"totalValue"`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries"`
	Samples    []TreemapEntry `json:"samples"`
}

// MetricAlert represents an alert associated with a metric.
type MetricAlert struct {
	AlertName string `json:"alertName"`
	AlertID   string `json:"alertId"`
}

// MetricAlertsResponse represents the response for metric alerts endpoint.
type MetricAlertsResponse struct {
	Alerts []MetricAlert `json:"alerts"`
}

// MetricDashboard represents a dashboard/widget referencing a metric.
type MetricDashboard struct {
	DashboardName string `json:"dashboardName"`
	DashboardID   string `json:"dashboardId"`
	WidgetID      string `json:"widgetId"`
	WidgetName    string `json:"widgetName"`
}

// MetricDashboardsResponse represents the response for metric dashboards endpoint.
type MetricDashboardsResponse struct {
	Dashboards []MetricDashboard `json:"dashboards"`
}

// MetricHighlightsResponse is the output structure for the metric highlights endpoint.
type MetricHighlightsResponse struct {
	DataPoints       uint64 `json:"dataPoints"`
	LastReceived     uint64 `json:"lastReceived"`
	TotalTimeSeries  uint64 `json:"totalTimeSeries"`
	ActiveTimeSeries uint64 `json:"activeTimeSeries"`
}

// MetricAttributesRequest represents the payload for the metric attributes endpoint.
type MetricAttributesRequest struct {
	MetricName string `json:"metricName"`
	Start      *int64 `json:"start,omitempty"`
	End        *int64 `json:"end,omitempty"`
}

// Validate ensures MetricAttributesRequest contains acceptable values.
func (req *MetricAttributesRequest) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.MetricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metric_name is required")
	}

	if req.Start != nil && req.End != nil {
		if *req.Start >= *req.End {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "start (%d) must be less than end (%d)", *req.Start, *req.End)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *MetricAttributesRequest) UnmarshalJSON(data []byte) error {
	type raw MetricAttributesRequest
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = MetricAttributesRequest(decoded)
	return req.Validate()
}

// MetricAttribute represents a single attribute with its values and count.
type MetricAttribute struct {
	Key        string   `json:"key"`
	Values     []string `json:"values"`
	ValueCount uint64   `json:"valueCount"`
}

// MetricAttributesResponse is the output structure for the metric attributes endpoint.
type MetricAttributesResponse struct {
	Attributes []MetricAttribute `json:"attributes"`
	TotalKeys  int64             `json:"totalKeys"`
}
