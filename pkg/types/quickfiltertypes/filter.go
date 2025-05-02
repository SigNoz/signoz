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
	SignalTraces        = Signal{valuer.NewString("traces")}
	SignalLogs          = Signal{valuer.NewString("logs")}
	SignalApiMonitoring = Signal{valuer.NewString("api_monitoring")}
	SignalExceptions    = Signal{valuer.NewString("exceptions")}
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
	case "exceptions":
		return SignalExceptions, nil
	default:
		return Signal{}, errors.New(errors.TypeInternal, errors.CodeInternal, "invalid signal: "+s)
	}
}

type StorableQuickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  valuer.UUID `bun:"org_id,type:text,notnull"`
	Filter string      `bun:"filter,type:text,notnull"`
	Signal Signal      `bun:"signal,type:text,notnull"`
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

// NewStorableQuickFilter creates a new StorableQuickFilter after validation
func NewStorableQuickFilter(orgID valuer.UUID, signal Signal, filterJSON []byte) (*StorableQuickFilter, error) {
	if orgID.StringValue() == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	if _, err := NewSignal(signal.StringValue()); err != nil {
		return nil, err
	}

	var filters []v3.AttributeKey
	if err := json.Unmarshal(filterJSON, &filters); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid filter JSON")
	}

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
	}, nil
}

// Update updates an existing StorableQuickFilter with new filter data after validation
func (quickfilter *StorableQuickFilter) Update(filterJSON []byte) error {
	var filters []v3.AttributeKey
	if err := json.Unmarshal(filterJSON, &filters); err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid filter JSON")
	}

	quickfilter.Filter = string(filterJSON)
	quickfilter.UpdatedAt = time.Now()
	return nil
}

// NewSignalFilterFromStorableQuickFilter converts a StorableQuickFilter to a SignalFilters object
func NewSignalFilterFromStorableQuickFilter(storableQuickFilter *StorableQuickFilter) (*SignalFilters, error) {
	if storableQuickFilter == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "storableQuickFilter cannot be nil")
	}

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

// NewDefaultQuickFilter generates default filters for all supported signals
func NewDefaultQuickFilter(orgID valuer.UUID) ([]*StorableQuickFilter, error) {
	tracesFilters := []map[string]interface{}{
		{"key": "duration_nano", "dataType": "float64", "type": "tag"},
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "hasError", "dataType": "bool", "type": "tag"},
		{"key": "serviceName", "dataType": "string", "type": "tag"},
		{"key": "name", "dataType": "string", "type": "resource"},
		{"key": "rpcMethod", "dataType": "string", "type": "tag"},
		{"key": "responseStatusCode", "dataType": "string", "type": "resource"},
		{"key": "httpHost", "dataType": "string", "type": "tag"},
		{"key": "httpMethod", "dataType": "string", "type": "tag"},
		{"key": "httpRoute", "dataType": "string", "type": "tag"},
		{"key": "httpUrl", "dataType": "string", "type": "tag"},
		{"key": "traceID", "dataType": "string", "type": "tag"},
	}

	logsFilters := []map[string]interface{}{
		{"key": "severity_text", "dataType": "string", "type": "resource"},
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "serviceName", "dataType": "string", "type": "tag"},
		{"key": "host.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
	}

	apiMonitoringFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "serviceName", "dataType": "string", "type": "tag"},
		{"key": "rpcMethod", "dataType": "string", "type": "tag"},
	}

	exceptionsFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "serviceName", "dataType": "string", "type": "tag"},
		{"key": "host.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.cluster.name", "dataType": "string", "type": "tag"},
		{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.namespace.name", "dataType": "string", "type": "tag"},
		{"key": "k8s.pod.name", "dataType": "string", "type": "tag"},
	}

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
	exceptionsJSON, err := json.Marshal(exceptionsFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal exceptions filters: %w", err)
	}

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
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(exceptionsJSON),
			Signal: SignalExceptions,
		},
	}, nil
}
