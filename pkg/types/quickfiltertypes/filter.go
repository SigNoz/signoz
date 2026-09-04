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

type Source struct {
	valuer.String
}

func (enum *Source) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	source, err := NewSource(str)
	if err != nil {
		return err
	}

	*enum = source
	return nil
}

var (
	SourceTraces          = Source{valuer.NewString("traces")}
	SourceLogs            = Source{valuer.NewString("logs")}
	SourceApiMonitoring   = Source{valuer.NewString("api_monitoring")}
	SourceExceptions      = Source{valuer.NewString("exceptions")}
	SourceMeter           = Source{valuer.NewString("meter")}
	SourceAiObservability = Source{valuer.NewString("ai_observability")}
)

func (Source) Enum() []any {
	return []any{
		SourceTraces,
		SourceLogs,
		SourceApiMonitoring,
		SourceExceptions,
		SourceMeter,
		SourceAiObservability,
	}
}

// NewSource creates a Source from a string.
func NewSource(s string) (Source, error) {
	switch s {
	case "traces":
		return SourceTraces, nil
	case "logs":
		return SourceLogs, nil
	case "api_monitoring":
		return SourceApiMonitoring, nil
	case "exceptions":
		return SourceExceptions, nil
	case "meter":
		return SourceMeter, nil
	case "ai_observability":
		return SourceAiObservability, nil
	default:
		return Source{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid source: %s", s)
	}
}

type StorableQuickFilter struct {
	bun.BaseModel `bun:"table:quick_filter"`
	types.Identifiable
	OrgID  valuer.UUID `bun:"org_id,type:text,notnull"`
	Filter string      `bun:"filter,type:text,notnull"`
	Source Source      `bun:"source,type:text,notnull"`
	types.TimeAuditable
}

type SourceFilters struct {
	types.Identifiable
	types.TimeAuditable

	OrgID   valuer.UUID                        `json:"orgId" required:"true"`
	Source  Source                             `json:"source" required:"true"`
	Filters []telemetrytypes.TelemetryFieldKey `json:"filters" required:"true" nullable:"false"`
}

type UpdatableQuickFilters struct {
	Filters []telemetrytypes.TelemetryFieldKey `json:"filters" required:"true" nullable:"false"`
}

// NewStorableQuickFilter creates a new StorableQuickFilter after validation.
func NewStorableQuickFilter(orgID valuer.UUID, source Source, filters []telemetrytypes.TelemetryFieldKey) (*StorableQuickFilter, error) {
	if orgID.IsZero() {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	if _, err := NewSource(source.StringValue()); err != nil {
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
		Source: source,
		Filter: string(filterJSON),
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}, nil
}

// NewSourceFiltersFromSource creates a SourceFilters with no filters for a source.
func NewSourceFiltersFromSource(source Source) *SourceFilters {
	return &SourceFilters{
		Source:  source,
		Filters: []telemetrytypes.TelemetryFieldKey{},
	}
}

// NewSourceFilterFromStorableQuickFilter converts a StorableQuickFilter to a SourceFilters object.
func NewSourceFilterFromStorableQuickFilter(storableQuickFilter *StorableQuickFilter) (*SourceFilters, error) {
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

	return &SourceFilters{
		Identifiable:  storableQuickFilter.Identifiable,
		OrgID:         storableQuickFilter.OrgID,
		Source:        storableQuickFilter.Source,
		Filters:       filters,
		TimeAuditable: storableQuickFilter.TimeAuditable,
	}, nil
}

// NewDefaultQuickFilter generates default filters for all supported sources.
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
		source  Source
		filters []telemetrytypes.TelemetryFieldKey
	}{
		{SourceTraces, tracesFilters},
		{SourceLogs, logsFilters},
		{SourceApiMonitoring, apiMonitoringFilters},
		{SourceExceptions, exceptionsFilters},
		{SourceMeter, meterFilters},
		{SourceAiObservability, aiObservabilityFilters},
	}

	storableQuickFilters := make([]*StorableQuickFilter, 0, len(defaults))
	for _, def := range defaults {
		storableQuickFilter, err := NewStorableQuickFilter(orgID, def.source, def.filters)
		if err != nil {
			return nil, err
		}
		storableQuickFilters = append(storableQuickFilters, storableQuickFilter)
	}

	return storableQuickFilters, nil
}

func validateFilters(filters []telemetrytypes.TelemetryFieldKey) error {
	for _, filter := range filters {
		if filter.Name == "" {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "filter name is required")
		}
	}
	return nil
}
