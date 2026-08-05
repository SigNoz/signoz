import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import APIError from 'types/api/error';

export const selectedEntityTracesColumns: BaseAutocompleteData[] = [
	{
		key: 'timestamp',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
	},
	{
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
	},
	{
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
	},
];

export function isKeyNotFoundError(error: unknown): boolean {
	if (!(error instanceof APIError)) {
		return false;
	}

	const errorDetails = error.getErrorDetails();
	if (errorDetails.error.code !== 'invalid_input') {
		return false;
	}

	const errors = errorDetails.error.errors || [];
	return errors.some((err) => err.message?.includes('not found'));
}
