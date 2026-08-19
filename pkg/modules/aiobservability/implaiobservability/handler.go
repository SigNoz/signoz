package implaiobservability

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/aiobservability"
	"github.com/SigNoz/signoz/pkg/telemetryschema/aitelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	telemetryMetadataStore telemetrytypes.MetadataStore
}

func NewHandler(telemetryMetadataStore telemetrytypes.MetadataStore) aiobservability.Handler {
	return &handler{
		telemetryMetadataStore: telemetryMetadataStore,
	}
}

func (handler *handler) GetFieldsKeys(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	var params aiobservabilitytypes.PostableFieldKeysParams
	if err := binding.Query.BindQuery(req.URL.Query(), &params); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}
	orgID := valuer.MustNewUUID(claims.OrgID)

	fieldKeySelector := aiobservabilitytypes.NewFieldKeySelectorFromPostableFieldKeysParams(params)

	keys := make(map[string][]*telemetrytypes.TelemetryFieldKey)
	complete := true
	// the trace context names the computed per-trace aggregates, which no scan can serve
	if fieldKeySelector.FieldContext != telemetrytypes.FieldContextTrace {
		keys, complete, err = handler.telemetryMetadataStore.GetKeys(ctx, orgID, fieldKeySelector)
		if err != nil {
			render.Error(rw, err)
			return
		}
	}

	render.Success(rw, http.StatusOK, &telemetrytypes.GettableFieldKeys{
		Keys:     aitelemetryschema.FieldKeys(keys, fieldKeySelector),
		Complete: complete,
	})
}

func (handler *handler) GetFieldsValues(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	// binding ignores query params the struct does not declare, so an unsupported
	// existingQuery would silently return values it did not narrow
	if req.URL.Query().Has("existingQuery") {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "existingQuery is not supported"))
		return
	}

	var params aiobservabilitytypes.PostableFieldValueParams
	if err := binding.Query.BindQuery(req.URL.Query(), &params); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	fieldValueSelector := aiobservabilitytypes.NewFieldValueSelectorFromPostableFieldValueParams(params)

	values := &telemetrytypes.TelemetryFieldValues{}
	complete := true
	// the trace context names the computed per-trace aggregates, which are never ingested
	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextTrace {
		values, complete, err = handler.telemetryMetadataStore.GetAllValues(ctx, valuer.MustNewUUID(claims.OrgID), fieldValueSelector)
		if err != nil {
			render.Error(rw, err)
			return
		}
	}

	render.Success(rw, http.StatusOK, &telemetrytypes.GettableFieldValues{
		Values:   values,
		Complete: complete,
	})
}
