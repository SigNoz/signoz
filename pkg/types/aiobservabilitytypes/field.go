package aiobservabilitytypes

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// the explorer lists AI traces, so the signal is always traces and the metric
// selectors do not apply.
type PostableFieldKeysParams struct {
	SearchText     string                       `query:"searchText"`
	FieldContext   telemetrytypes.FieldContext  `query:"fieldContext"`
	FieldDataType  telemetrytypes.FieldDataType `query:"fieldDataType"`
	StartUnixMilli int64                        `query:"startUnixMilli"`
	EndUnixMilli   int64                        `query:"endUnixMilli"`
	Limit          int                          `query:"limit"`
}

// existingQuery is unsupported until the computed per-trace aggregates it may
// reference can be narrowed on.
type PostableFieldValueParams struct {
	PostableFieldKeysParams
	Name string `query:"name"`
}

func NewFieldKeySelectorFromPostableFieldKeysParams(params PostableFieldKeysParams) *telemetrytypes.FieldKeySelector {
	return telemetrytypes.NewFieldKeySelectorFromPostableFieldKeysParams(params.telemetryParams())
}

func NewFieldValueSelectorFromPostableFieldValueParams(params PostableFieldValueParams) *telemetrytypes.FieldValueSelector {
	return telemetrytypes.NewFieldValueSelectorFromPostableFieldValueParams(telemetrytypes.PostableFieldValueParams{
		PostableFieldKeysParams: params.telemetryParams(),
		Name:                    params.Name,
	})
}

func (params PostableFieldKeysParams) telemetryParams() telemetrytypes.PostableFieldKeysParams {
	return telemetrytypes.PostableFieldKeysParams{
		Signal:         telemetrytypes.SignalTraces,
		SearchText:     params.SearchText,
		FieldContext:   params.FieldContext,
		FieldDataType:  params.FieldDataType,
		StartUnixMilli: params.StartUnixMilli,
		EndUnixMilli:   params.EndUnixMilli,
		Limit:          params.Limit,
	}
}
