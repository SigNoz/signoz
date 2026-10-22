import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export const mergeExtraFields = (
	extra: TelemetryFieldKey[] = [],
	fetched: TelemetryFieldKey[],
): TelemetryFieldKey[] => {
	const extraKeys = new Set(
		extra.map((field) =>
			buildCompositeKey(field.name, field.fieldContext, field.fieldDataType),
		),
	);

	return [
		...extra,
		...fetched.filter(
			(field) =>
				!extraKeys.has(
					buildCompositeKey(field.name, field.fieldContext, field.fieldDataType),
				),
		),
	];
};
