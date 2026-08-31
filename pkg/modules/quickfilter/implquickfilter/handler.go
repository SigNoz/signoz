package implquickfilter

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module quickfilter.Module
}

func NewHandler(module quickfilter.Module) quickfilter.Handler {
	return &handler{module: module}
}

// legacySignalFilters is the v1 API shape: filters as v3 attribute keys.
type legacySignalFilters struct {
	Signal  quickfiltertypes.Signal `json:"signal"`
	Filters []v3.AttributeKey       `json:"filters"`
}

// newTelemetryFieldKeysFromLegacy converts a v1 write payload with the same
// normalizations as the storage migration: alias contexts, numerics to number.
// The v1 shape carries no per filter signal, so meter keys get it restored.
func newTelemetryFieldKeysFromLegacy(signal quickfiltertypes.Signal, filters []v3.AttributeKey) ([]telemetrytypes.TelemetryFieldKey, error) {
	var fieldSignal telemetrytypes.Signal
	if signal == quickfiltertypes.SignalMeter {
		fieldSignal = telemetrytypes.SignalMetrics
	}

	fieldKeys := make([]telemetrytypes.TelemetryFieldKey, 0, len(filters))
	for _, filter := range filters {
		if err := filter.Validate(); err != nil {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid filter: %v", err)
		}

		fieldContext, ok := telemetrytypes.FieldContextFromText(string(filter.Type))
		if !ok {
			fieldContext = telemetrytypes.FieldContextUnspecified
		}

		var fieldDataType telemetrytypes.FieldDataType
		if err := fieldDataType.Scan(string(filter.DataType)); err != nil {
			fieldDataType = telemetrytypes.FieldDataTypeUnspecified
		}
		if fieldDataType == telemetrytypes.FieldDataTypeInt64 {
			fieldDataType = telemetrytypes.FieldDataTypeNumber
		}

		fieldKeys = append(fieldKeys, telemetrytypes.TelemetryFieldKey{
			Name:          filter.Key,
			Signal:        fieldSignal,
			FieldContext:  fieldContext,
			FieldDataType: fieldDataType,
		})
	}

	return fieldKeys, nil
}

// newLegacySignalFiltersFromSignalFilters renders stored telemetry field keys
// back into the v1 shape, restoring the legacy spellings v1 clients expect.
func newLegacySignalFiltersFromSignalFilters(signalFilters *quickfiltertypes.SignalFilters) *legacySignalFilters {
	filters := make([]v3.AttributeKey, 0, len(signalFilters.Filters))
	for _, fieldKey := range signalFilters.Filters {
		// Only tag and resource exist in the v3 enum; other contexts render as
		// unspecified so v1 clients never see spellings their queries can't use.
		var attributeType v3.AttributeKeyType
		switch fieldKey.FieldContext {
		case telemetrytypes.FieldContextAttribute:
			attributeType = v3.AttributeKeyTypeTag
		case telemetrytypes.FieldContextResource:
			attributeType = v3.AttributeKeyTypeResource
		default:
			attributeType = v3.AttributeKeyTypeUnspecified
		}

		var dataType v3.AttributeKeyDataType
		switch fieldKey.FieldDataType {
		case telemetrytypes.FieldDataTypeNumber:
			dataType = v3.AttributeKeyDataTypeFloat64
		default:
			dataType = v3.AttributeKeyDataType(fieldKey.FieldDataType.StringValue())
		}

		filters = append(filters, v3.AttributeKey{
			Key:      fieldKey.Name,
			Type:     attributeType,
			DataType: dataType,
		})
	}

	return &legacySignalFilters{
		Signal:  signalFilters.Signal,
		Filters: filters,
	}
}

func (handler *handler) GetQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), quickfiltertypes.Signal{})
	if err != nil {
		render.Error(rw, err)
		return
	}

	legacyFilters := make([]*legacySignalFilters, 0, len(filters))
	for _, signalFilters := range filters {
		legacyFilters = append(legacyFilters, newLegacySignalFiltersFromSignalFilters(signalFilters))
	}

	render.Success(rw, http.StatusOK, legacyFilters)
}

func (handler *handler) GetSignalFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	signal := mux.Vars(r)["signal"]
	validatedSignal, err := quickfiltertypes.NewSignal(signal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), validatedSignal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, newLegacySignalFiltersFromSignalFilters(handler.signalFiltersOrEmpty(filters, validatedSignal)))
}

func (handler *handler) UpdateQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req legacySignalFilters
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	fieldKeys, err := newTelemetryFieldKeysFromLegacy(req.Signal, req.Filters)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.UpsertQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), req.Signal, fieldKeys)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) ListQuickFiltersV2(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), quickfiltertypes.Signal{})
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, filters)
}

func (handler *handler) UpdateQuickFiltersV2(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req quickfiltertypes.UpdatableQuickFilters
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.UpsertQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), req.Signal, req.Filters)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) GetQuickFiltersV2(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	signal := mux.Vars(r)["signal_name"]
	validatedSignal, err := quickfiltertypes.NewSignal(signal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), validatedSignal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, handler.signalFiltersOrEmpty(filters, validatedSignal))
}

// signalFiltersOrEmpty keeps the single-signal response contract: a signal
// with no stored filters is served as an empty filter list, not an error.
func (handler *handler) signalFiltersOrEmpty(filters []*quickfiltertypes.SignalFilters, signal quickfiltertypes.Signal) *quickfiltertypes.SignalFilters {
	if len(filters) == 0 {
		return quickfiltertypes.NewSignalFiltersFromSignal(signal)
	}
	return filters[0]
}
