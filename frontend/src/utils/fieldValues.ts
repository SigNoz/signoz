import { TelemetrytypesTelemetryFieldValuesDTO } from 'api/generated/services/sigNoz.schemas';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

// Numbers and bools stay raw so tags keep their value type.
export const getValuesForDataType = (
	values: TelemetrytypesTelemetryFieldValuesDTO | undefined,
	dataType: DataTypes | undefined,
): string[] => {
	switch (dataType) {
		case DataTypes.Int64:
		case DataTypes.Float64:
		case DataTypes.ArrayInt64:
		case DataTypes.ArrayFloat64:
			return (values?.numberValues ?? []) as unknown as string[];
		case DataTypes.bool:
		case DataTypes.ArrayBool:
			return (values?.boolValues ?? []) as unknown as string[];
		default:
			return values?.stringValues ?? [];
	}
};
