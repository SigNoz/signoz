package quickfiltertypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
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
	SignalTraces        = Signal{valuer.NewString("traces")}
	SignalLogs          = Signal{valuer.NewString("logs")}
	SignalApiMonitoring = Signal{valuer.NewString("api_monitoring")}
	SignalExceptions    = Signal{valuer.NewString("exceptions")}
	SignalMeter         = Signal{valuer.NewString("meter")}
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
	case "meter":
		return SignalMeter, nil
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
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
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
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "name", "dataType": "string", "type": "tag"},
		{"key": "rpc.method", "dataType": "string", "type": "tag"},
		{"key": "response_status_code", "dataType": "string", "type": "tag"},
		{"key": "http_host", "dataType": "string", "type": "tag"},
		{"key": "http.method", "dataType": "string", "type": "tag"},
		{"key": "http.route", "dataType": "string", "type": "tag"},
		{"key": "http_url", "dataType": "string", "type": "tag"},
		{"key": "trace_id", "dataType": "string", "type": "tag"},
	}

	logsFilters := []map[string]interface{}{
		{"key": "severity_text", "dataType": "string", "type": "resource"},
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "host.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
	}

	apiMonitoringFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "rpc.method", "dataType": "string", "type": "tag"},
	}

	exceptionsFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "host.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.cluster.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.deployment.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.namespace.name", "dataType": "string", "type": "resource"},
		{"key": "k8s.pod.name", "dataType": "string", "type": "resource"},
	}

	meterFilters := []map[string]interface{}{
		{"key": "deployment.environment", "dataType": "float64", "type": "Sum"},
		{"key": "service.name", "dataType": "float64", "type": "Sum"},
		{"key": "host.name", "dataType": "float64", "type": "Sum"},
	}

	tracesJSON, err := json.Marshal(tracesFilters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal traces filters")
	}

	logsJSON, err := json.Marshal(logsFilters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal logs filters")
	}

	apiMonitoringJSON, err := json.Marshal(apiMonitoringFilters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal api monitoring filters")
	}

	exceptionsJSON, err := json.Marshal(exceptionsFilters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal exceptions filters")
	}

	meterJSON, err := json.Marshal(meterFilters)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal meter filters")
	}

	timeRightNow := time.Now()

	return []*StorableQuickFilter{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(tracesJSON),
			Signal: SignalTraces,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: timeRightNow,
				UpdatedAt: timeRightNow,
			},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(logsJSON),
			Signal: SignalLogs,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: timeRightNow,
				UpdatedAt: timeRightNow,
			},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(apiMonitoringJSON),
			Signal: SignalApiMonitoring,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: timeRightNow,
				UpdatedAt: timeRightNow,
			},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(exceptionsJSON),
			Signal: SignalExceptions,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: timeRightNow,
				UpdatedAt: timeRightNow,
			},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			OrgID:  orgID,
			Filter: string(meterJSON),
			Signal: SignalMeter,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: timeRightNow,
				UpdatedAt: timeRightNow,
			},
		},
	}, nil
}
