package quickfiltertypes

import (
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"time"
)

type Signal struct {
	valuer.String
}

func (enum *Signal) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	signal, err := NewSignal(str)
	if err != nil {
		return err
	}

	*enum = signal
	return nil
}

var (
	SignalTraces = Signal{valuer.NewString("traces")}
	SignalLogs   = Signal{valuer.NewString("logs")}
	//SignalMetrics     = Signal{valuer.NewString("METRICS")}
	//SignalInfra       = Signal{valuer.NewString("INFRA")}
	SignalApiMonitoring = Signal{valuer.NewString("api_monitoring")}
)

// NewSignal creates a Signal from a string
func NewSignal(s string) (Signal, error) {
	switch s {
	case "traces":
		return SignalTraces, nil
	case "logs":
		return SignalLogs, nil
	case "api_monitoring":
		return SignalApiMonitoring, nil
	default:
		return Signal{}, errors.New(errors.TypeInternal, errors.CodeInternal, "invalid signal: "+s)
	}
}

// updateExistingFilter updates an existing StorableQuickFilter with new filter data
func UpdateExistingFilter(existingFilter *StorableQuickFilter, filterJSON []byte) *StorableQuickFilter {
	// Validation of existing filter and filterJson has been done already
	filter := existingFilter
	filter.Filter = string(filterJSON)
	filter.UpdatedAt = time.Now()
	return filter
}

type StorableQuickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  valuer.UUID `bun:"org_id,type:text,notnull"` // Changed from valuer.String to string
	Filter string      `bun:"filter,type:text,notnull"` // Changed from valuer.String to string
	Signal Signal      `bun:"signal,type:text,notnull"` // Changed from Signal to string
	types.TimeAuditable
}

type SignalFilters struct {
	Signal  Signal            `json:"signal"`
	Filters []v3.AttributeKey `json:"filters"`
}

type UpdatableQuickFilters struct {
	Signal  Signal            `json:"signal"`
	Filters []v3.AttributeKey `json:"filters"`
}

// NewSignalFilterFromStorableQuickFilter converts a StorableQuickFilter to a SignalFilters object
func NewSignalFilterFromStorableQuickFilter(storableQuickFilter *StorableQuickFilter) (*SignalFilters, error) {
	if storableQuickFilter == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "storableQuickFilter cannot be nil")
	}
	// Unmarshal filters from JSON string
	var filters []v3.AttributeKey
	if storableQuickFilter.Filter != "" {
		err := json.Unmarshal([]byte(storableQuickFilter.Filter), &filters)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error unmarshalling filters")
		}
	}

	return &SignalFilters{
		Signal:  storableQuickFilter.Signal,
		Filters: filters,
	}, nil
}

// createNewFilter creates a new StorableQuickFilter
func CreateNewFilter(orgID valuer.UUID, signal Signal, filterJSON []byte) *StorableQuickFilter {
	now := time.Now()
	return &StorableQuickFilter{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		OrgID:  orgID,
		Signal: signal,
		Filter: string(filterJSON),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
}

func NewDefaultQuickFilter(orgID valuer.UUID) ([]*StorableQuickFilter, error) {
	// Define filters for TRACES
	tracesFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "hasError", "dataType": "bool", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "serviceName", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "rpcMethod", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "responseStatusCode", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "httpHost", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "httpMethod", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "httpRoute", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "httpUrl", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "traceID", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
	}

	// Define filters for LOGS
	logsFilters := []map[string]interface{}{
		{"key": "severity_text", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "deployment.environment", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "serviceName", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "host.name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "k8s.cluster.name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "k8s.deployment.name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "k8s.namespace.name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "k8s.pod.name", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
	}

	// Define filters for API_MONITORING
	apiMonitoringFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource", "isColumn": false, "isJSON": false},
		{"key": "serviceName", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
		{"key": "rpcMethod", "dataType": "string", "type": "tag", "isColumn": false, "isJSON": false},
	}

	// Convert to JSON strings with error handling
	tracesJSON, err := json.Marshal(tracesFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal traces filters: %w", err)
	}

	logsJSON, err := json.Marshal(logsFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal logs filters: %w", err)
	}

	apiMonitoringJSON, err := json.Marshal(apiMonitoringFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal API monitoring filters: %w", err)
	}

	// Create one entry per signal
	return []*StorableQuickFilter{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(tracesJSON),
			Signal: SignalTraces,
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(logsJSON),
			Signal: SignalLogs,
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(apiMonitoringJSON),
			Signal: SignalApiMonitoring,
		},
	}, nil
}
