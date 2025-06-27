import { TelemetryFieldKey } from 'api/v5/v5';
import { IField } from 'types/api/logs/fields';

export const convertKeysToColumnFields = (
	keys: TelemetryFieldKey[],
): IField[] =>
	keys.map((item) => ({
		dataType: item.fieldDataType ?? '',
		name: item.name,
		type: item.fieldContext ?? '',
	}));
