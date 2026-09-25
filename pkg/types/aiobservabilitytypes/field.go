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

// existingQuery may reference the computed per-trace aggregates, which are
// never ingested; those filters are stripped before narrowing values.
type PostableFieldValueParams struct {
	PostableFieldKeysParams
	Name          string `query:"name"`
	ExistingQuery string `query:"existingQuery"`
}

func NewFieldKeySelectorFromPostableFieldKeysParams(params PostableFieldKeysParams) *telemetrytypes.FieldKeySelector {
	return telemetrytypes.NewFieldKeySelectorFromPostableFieldKeysParams(params.telemetryParams())
}

func NewFieldValueSelectorFromPostableFieldValueParams(params PostableFieldValueParams) *telemetrytypes.FieldValueSelector {
	return telemetrytypes.NewFieldValueSelectorFromPostableFieldValueParams(telemetrytypes.PostableFieldValueParams{
		PostableFieldKeysParams: params.telemetryParams(),
		Name:                    params.Name,
		ExistingQuery:           params.ExistingQuery,
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
