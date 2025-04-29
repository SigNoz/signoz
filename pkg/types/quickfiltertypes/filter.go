package quickfiltertypes

import (
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Signal struct {
	valuer.String
}

var (
	SignalTraces = Signal{valuer.NewString("TRACES")}
	SignalLogs   = Signal{valuer.NewString("LOGS")}
	//SignalMetrics     = Signal{valuer.NewString("METRICS")}
	//SignalInfra       = Signal{valuer.NewString("INFRA")}
	SignalApiMonitoring = Signal{valuer.NewString("API_MONITORING")}
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

type StorableQuickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  valuer.UUID `bun:"org_id,type:text,notnull"` // Changed from valuer.String to string
	Filter string      `bun:"filter,type:text,notnull"` // Changed from valuer.String to string
	Signal string      `bun:"signal,type:text,notnull"` // Changed from Signal to string
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

	// Convert signal string to Signal type
	signal, err := NewSignal(storableQuickFilter.Signal)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "invalid signal type: %s", storableQuickFilter.Signal)
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
		Signal:  signal,
		Filters: filters,
	}, nil
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
			Signal: "traces",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(logsJSON),
			Signal: "logs",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(apiMonitoringJSON),
			Signal: "api_monitoring",
		},
	}, nil
}
