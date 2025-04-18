package fields

import (
	"bytes"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"go.uber.org/zap"
)

type API struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
}

func NewAPI(telemetryStore telemetrystore.TelemetryStore) *API {

	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		telemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.TimeseriesV41weekTableName,
		telemetrymetrics.TimeseriesV41weekLocalTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
	)

	return &API{
		telemetryStore:         telemetryStore,
		telemetryMetadataStore: telemetryMetadataStore,
	}
}

func (api *API) GetFieldsKeys(w http.ResponseWriter, r *http.Request) {

	type fieldKeysResponse struct {
		Keys     map[string][]*telemetrytypes.TelemetryFieldKey `json:"keys"`
		Complete bool                                           `json:"complete"`
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()

	fieldKeySelector, err := parseFieldKeyRequest(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	keys, err := api.telemetryMetadataStore.GetKeys(ctx, fieldKeySelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	response := fieldKeysResponse{
		Keys:     keys,
		Complete: len(keys) < fieldKeySelector.Limit,
	}

	render.Success(w, http.StatusOK, response)
}

func (api *API) GetFieldsValues(w http.ResponseWriter, r *http.Request) {

	type fieldValuesResponse struct {
		Values   *telemetrytypes.TelemetryFieldValues `json:"values"`
		Complete bool                                 `json:"complete"`
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()

	fieldValueSelector, err := parseFieldValueRequest(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	allValues, err := api.telemetryMetadataStore.GetAllValues(ctx, fieldValueSelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	relatedValues, err := api.telemetryMetadataStore.GetRelatedValues(ctx, fieldValueSelector)
	if err != nil {
		// we don't want to return error if we fail to get related values for some reason
		zap.L().Error("failed to get related values", zap.Error(err))
		relatedValues = []string{}
	}

	values := &telemetrytypes.TelemetryFieldValues{
		StringValues:  allValues.StringValues,
		NumberValues:  allValues.NumberValues,
		RelatedValues: relatedValues,
	}

	response := fieldValuesResponse{
		Values: values,
		Complete: len(values.StringValues) < fieldValueSelector.Limit &&
			len(values.BoolValues) < fieldValueSelector.Limit &&
			len(values.NumberValues) < fieldValueSelector.Limit &&
			len(values.RelatedValues) < fieldValueSelector.Limit,
	}

	render.Success(w, http.StatusOK, response)
}
