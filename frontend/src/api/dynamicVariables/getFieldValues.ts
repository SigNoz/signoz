import { ApiBaseInstance } from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';

/**
 * Get field values for a given signal type and field name
 * @param signal Type of signal (traces, logs, metrics)
 * @param name Name of the attribute for which values are being fetched
 * @param value Optional search text
 */
export const getFieldValues = async (
	signal?: 'traces' | 'logs' | 'metrics',
	name?: string,
	value?: string,
	startUnixMilli?: number,
	endUnixMilli?: number,
	existingQuery?: string,
): Promise<SuccessResponse<FieldValueResponse> | ErrorResponse> => {
	const params: Record<string, string> = {};

	if (signal) {
		params.signal = signal;
	}

	if (name) {
		params.name = name;
	}

	if (value) {
		params.value = value;
	}

	if (startUnixMilli) {
		params.startUnixMilli = Math.floor(startUnixMilli / 1000000).toString();
	}

	if (endUnixMilli) {
		params.endUnixMilli = Math.floor(endUnixMilli / 1000000).toString();
	}

	if (existingQuery) {
		params.existingQuery = existingQuery;
	}

	const response = await ApiBaseInstance.get('/fields/values', { params });

	// Normalize values from different types (stringValues, boolValues, etc.)
	if (response.data?.data?.values) {
		const allValues: string[] = [];
		Object.entries(response.data.data.values).forEach(
			([key, valueArray]: [string, any]) => {
				// Skip RelatedValues as they should be kept separate
				if (key === 'relatedValues') {
					return;
				}

				if (Array.isArray(valueArray)) {
					allValues.push(...valueArray.map(String));
				}
			},
		);

		// Add a normalized values array to the response
		response.data.data.normalizedValues = allValues;

		// Add relatedValues to the response as per FieldValueResponse
		if (response.data.data.values.relatedValues) {
			response.data.data.relatedValues = response.data.data.values.relatedValues;
		}
	}

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default getFieldValues;
