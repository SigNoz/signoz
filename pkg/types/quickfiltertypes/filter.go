package quickfiltertypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
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
	SignalTraces          = Signal{valuer.NewString("traces")}
	SignalLogs            = Signal{valuer.NewString("logs")}
	SignalApiMonitoring   = Signal{valuer.NewString("api_monitoring")}
	SignalExceptions      = Signal{valuer.NewString("exceptions")}
	SignalMeter           = Signal{valuer.NewString("meter")}
	SignalAiObservability = Signal{valuer.NewString("ai_observability")}
)

// NewSignal creates a Signal from a string.
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
	case "meter":
		return SignalMeter, nil
	case "ai_observability":
		return SignalAiObservability, nil
	default:
		return Signal{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", s)
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
	Signal  Signal                             `json:"signal"`
	Filters []telemetrytypes.TelemetryFieldKey `json:"filters" required:"true" nullable:"false"`
}

type UpdatableQuickFilters struct {
	Signal  Signal                             `json:"signal"`
	Filters []telemetrytypes.TelemetryFieldKey `json:"filters" required:"true" nullable:"false"`
}

func validateFilters(filters []telemetrytypes.TelemetryFieldKey) error {
	for _, filter := range filters {
		if filter.Name == "" {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "filter name is required")
		}
	}
	return nil
}

// NewStorableQuickFilter creates a new StorableQuickFilter after validation.
func NewStorableQuickFilter(orgID valuer.UUID, signal Signal, filters []telemetrytypes.TelemetryFieldKey) (*StorableQuickFilter, error) {
	if orgID.IsZero() {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	if _, err := NewSignal(signal.StringValue()); err != nil {
		return nil, err
	}

	if err := validateFilters(filters); err != nil {
		return nil, err
	}

	// A nil slice marshals to the JSON literal "null"; store an empty array so
	// reads never have to render a null filter list.
	if filters == nil {
		filters = []telemetrytypes.TelemetryFieldKey{}
	}

	filterJSON, err := json.Marshal(filters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error marshalling filters")
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

// NewSignalFiltersFromSignal creates a SignalFilters with no filters for a signal.
func NewSignalFiltersFromSignal(signal Signal) *SignalFilters {
	return &SignalFilters{
		Signal:  signal,
		Filters: []telemetrytypes.TelemetryFieldKey{},
	}
}

// NewSignalFilterFromStorableQuickFilter converts a StorableQuickFilter to a SignalFilters object.
func NewSignalFilterFromStorableQuickFilter(storableQuickFilter *StorableQuickFilter) (*SignalFilters, error) {
	if storableQuickFilter == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "storableQuickFilter cannot be nil")
	}

	filters := []telemetrytypes.TelemetryFieldKey{}
	if storableQuickFilter.Filter != "" {
		err := json.Unmarshal([]byte(storableQuickFilter.Filter), &filters)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "error unmarshalling filters")
		}
	}

	// Stored filter JSON can be the literal "null" (a nil slice was upserted),
	// which unmarshals to nil; the API contract requires a non-null array.
	if filters == nil {
		filters = []telemetrytypes.TelemetryFieldKey{}
	}

	return &SignalFilters{
		Signal:  storableQuickFilter.Signal,
		Filters: filters,
	}, nil
}

// NewDefaultQuickFilter generates default filters for all supported signals.
func NewDefaultQuickFilter(orgID valuer.UUID) ([]*StorableQuickFilter, error) {
	tracesFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "duration_nano", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
		{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "hasError", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeBool},
		{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "name", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "rpc.method", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "response_status_code", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "http_host", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "http.method", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "http.route", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "http_url", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "trace_id", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	logsFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "severity_text", FieldContext: telemetrytypes.FieldContextLog, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "host.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.cluster.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.deployment.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.namespace.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.pod.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	apiMonitoringFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "rpc.method", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	exceptionsFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "host.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.cluster.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.deployment.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.namespace.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "k8s.pod.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	// Meter keys are label names with no context or datatype: the meter fields
	// API returns them as name+signal only, so the defaults mirror that shape.
	meterFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "deployment.environment", Signal: telemetrytypes.SignalMetrics},
		{Name: "service.name", Signal: telemetrytypes.SignalMetrics},
		{Name: "host.name", Signal: telemetrytypes.SignalMetrics},
	}

	// AI observability (builder_ai_query trace explorer), ordered by expected
	// usage: env scoping, the LLM identity keys, then service and the rest.
	aiObservabilityFilters := []telemetrytypes.TelemetryFieldKey{
		{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: aiobservabilitytypes.GenAIOperationName, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: aiobservabilitytypes.GenAIProviderName, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: aiobservabilitytypes.GenAIRequestModel, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: aiobservabilitytypes.GenAIToolName, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: aiobservabilitytypes.GenAIAgentName, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
	}

	defaults := []struct {
		signal  Signal
		filters []telemetrytypes.TelemetryFieldKey
	}{
		{SignalTraces, tracesFilters},
		{SignalLogs, logsFilters},
		{SignalApiMonitoring, apiMonitoringFilters},
		{SignalExceptions, exceptionsFilters},
		{SignalMeter, meterFilters},
		{SignalAiObservability, aiObservabilityFilters},
	}

	storableQuickFilters := make([]*StorableQuickFilter, 0, len(defaults))
	for _, def := range defaults {
		storableQuickFilter, err := NewStorableQuickFilter(orgID, def.signal, def.filters)
		if err != nil {
			return nil, err
		}
		storableQuickFilters = append(storableQuickFilters, storableQuickFilter)
	}

	return storableQuickFilters, nil
}
