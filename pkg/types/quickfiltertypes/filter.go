package quickfiltertypes

import (
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
	return []*StorableQuickFilter{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"hasError","datatype":"bool","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"name","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"rpcMethod","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"responseStatusCode","datatype":"string","type":"resource"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"httpHost","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"httpMethod","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"httpRoute","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"httpUrl","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"traceID","datatype":"string","type":"tag"}`,
			Signal: "TRACES",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"severity_text","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"host.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"k8s.cluster.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"k8s.deployment.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"k8s.namespace.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"k8s.pod.name","datatype":"string","type":"resource"}`,
			Signal: "LOGS",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"deployment.environment","datatype":"string","type":"resource"}`,
			Signal: "API_MONITORING",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"serviceName","datatype":"string","type":"tag"}`,
			Signal: "API_MONITORING",
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: `{"key":"rpcMethod","datatype":"string","type":"tag"}`,
			Signal: "API_MONITORING",
		},
	}
}
