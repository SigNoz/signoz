package fields

import (
	"bytes"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type API struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
}

// TODO: move this to module and remove metastore init
func NewAPI(
	settings factory.ProviderSettings,
	telemetryStore telemetrystore.TelemetryStore,
) *API {
	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		settings,
		telemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanAttributesKeysTblName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrymeter.DBName,
		telemetrymeter.SamplesAgg1dTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrylogs.LogAttributeKeysTblName,
		telemetrylogs.LogResourceKeysTblName,
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

	keys, complete, err := api.telemetryMetadataStore.GetKeys(ctx, fieldKeySelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	response := fieldKeysResponse{
		Keys:     keys,
		Complete: complete,
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

	allValues, allComplete, err := api.telemetryMetadataStore.GetAllValues(ctx, fieldValueSelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	relatedValues, relatedComplete, err := api.telemetryMetadataStore.GetRelatedValues(ctx, fieldValueSelector)
	if err != nil {
		// we don't want to return error if we fail to get related values for some reason
		relatedValues = []string{}
	}

	values := &telemetrytypes.TelemetryFieldValues{
		StringValues:  allValues.StringValues,
		NumberValues:  allValues.NumberValues,
		RelatedValues: relatedValues,
	}

	response := fieldValuesResponse{
		Values:   values,
		Complete: allComplete && relatedComplete,
	}

	render.Success(w, http.StatusOK, response)
}
