package fields

import (
	"context"

	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetryspans"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
	"go.uber.org/zap"
)

type FieldsResource struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore types.Metadata
}

func NewFieldsResource(
	telemetryStore telemetrystore.TelemetryStore,
) (*FieldsResource, error) {

	telemetryMetadataStore, err := telemetrymetadata.NewTelemetryMetaStore(
		telemetryStore,
		telemetryspans.DBName,
		telemetryspans.TagAttributesV2TableName,
		telemetryspans.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.TimeseriesV41weekTableName,
		telemetrymetrics.TimeseriesV41weekLocalTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
	)
	if err != nil {
		return nil, err
	}

	return &FieldsResource{
		telemetryStore:         telemetryStore,
		telemetryMetadataStore: telemetryMetadataStore,
	}, nil
}

func (f *FieldsResource) GetFieldKeys(ctx context.Context, fieldKeySelector types.FieldKeySelector) (map[string][]types.TelemetryFieldKey, error) {
	return f.telemetryMetadataStore.GetKeys(ctx, fieldKeySelector)
}

func (f *FieldsResource) GetFieldValues(ctx context.Context, fieldValueSelector types.FieldValueSelector) (*types.TelemetryFieldValues, error) {

	allValues, err := f.telemetryMetadataStore.GetAllValues(ctx, fieldValueSelector)
	if err != nil {
		return nil, err
	}

	relatedValues, err := f.telemetryMetadataStore.GetRelatedValues(ctx, fieldValueSelector)
	if err != nil {
		// we don't want to return error if we fail to get related values for some reason
		zap.L().Error("failed to get related values", zap.Error(err))
		relatedValues = []string{}
	}

	return &types.TelemetryFieldValues{
		StringValues:  allValues.StringValues,
		NumberValues:  allValues.NumberValues,
		RelatedValues: relatedValues,
	}, nil
}
