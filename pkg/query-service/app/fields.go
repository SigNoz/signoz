package app

import (
	"bytes"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/query-service/app/fields"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type FieldKeysResponse struct {
	Keys     map[string][]*telemetrytypes.TelemetryFieldKey `json:"keys"`
	Complete bool                                           `json:"complete"`
}

type FieldValuesResponse struct {
	Values   *telemetrytypes.TelemetryFieldValues `json:"values"`
	Complete bool                                 `json:"complete"`
}

func (aH *APIHandler) getFieldsKeys(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()

	fieldKeySelector, err := fields.ParseFieldKeyRequest(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	keys, err := aH.FieldsResource.GetFieldKeys(ctx, fieldKeySelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	response := FieldKeysResponse{
		Keys:     keys,
		Complete: len(keys) < fieldKeySelector.Limit,
	}

	render.Success(w, http.StatusOK, response)
}

func (aH *APIHandler) getFieldsValues(w http.ResponseWriter, r *http.Request) {
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	ctx := r.Context()

	fieldValueSelector, err := fields.ParseFieldValueRequest(r)
	if err != nil {
		render.Error(w, err)
		return
	}
	values, err := aH.FieldsResource.GetFieldValues(ctx, fieldValueSelector)
	if err != nil {
		render.Error(w, err)
		return
	}

	response := FieldValuesResponse{
		Values: values,
		Complete: len(values.StringValues) < fieldValueSelector.Limit &&
			len(values.BoolValues) < fieldValueSelector.Limit &&
			len(values.NumberValues) < fieldValueSelector.Limit &&
			len(values.RelatedValues) < fieldValueSelector.Limit,
	}

	render.Success(w, http.StatusOK, response)
}
