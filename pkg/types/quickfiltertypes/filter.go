package quickfiltertypes

import (
	"encoding/json"
	"fmt"
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

// ValidSignals is a map of valid signal values
var ValidSignals = map[string]bool{
	SignalTraces.StringValue(): true,
	SignalLogs.StringValue():   true,
	//SignalMetrics.StringValue():       true,
	//SignalInfra.StringValue():         true,
	SignalApiMonitoring.StringValue(): true,
}

// IsValidSignal checks if a signal string is valid
func IsValidSignal(signal string) bool {
	return ValidSignals[signal]
}

// SignalFromString creates a Signal from a string
func SignalFromString(s string) Signal {
	return Signal{valuer.NewString(s)}
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

// Validate checks if the quick filter update request is valid
func (u *UpdatableQuickFilters) Validate() error {
	// Validate signal
	if !IsValidSignal(u.Signal.StringValue()) {
		return fmt.Errorf("invalid signal: %s", u.Signal.StringValue())
	}

	// Validate each filter
	for _, filter := range u.Filters {
		if err := filter.Validate(); err != nil {
			return fmt.Errorf("invalid filter: %v", err)
		}
	}

	return nil
}

func NewDefaultQuickFilter(orgID valuer.UUID) []*StorableQuickFilter {
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

	// Convert to JSON strings
	tracesJSON, _ := json.Marshal(tracesFilters)
	logsJSON, _ := json.Marshal(logsFilters)
	apiMonitoringJSON, _ := json.Marshal(apiMonitoringFilters)

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
	}
}
