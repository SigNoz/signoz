/* eslint-disable sonarjs/cognitive-complexity */
import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';

/**
 * Get field values for a given signal type and field name
 * @param signal Type of signal (traces, logs, metrics)
 * @param name Name of the attribute for which values are being fetched
 * @param value Optional search text
 * @param existingQuery Optional existing query - across all present dynamic variables
 */
export const getFieldValues = async (
	signal?: 'traces' | 'logs' | 'metrics',
	name?: string,
	searchText?: string,
	startUnixMilli?: number,
	endUnixMilli?: number,
	existingQuery?: string,
): Promise<SuccessResponseV2<FieldValueResponse>> => {
	const params: Record<string, string> = {};

	if (signal) {
		params.signal = encodeURIComponent(signal);
	}

	if (name) {
		params.name = encodeURIComponent(name);
	}

	if (searchText) {
		params.searchText = encodeURIComponent(searchText);
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

	try {
		const response = await axios.get('/fields/values', { params });

		// Normalize values from different types (stringValues, boolValues, etc.)
		if (response.data?.data?.values) {
			const allValues: string[] = [];
			Object.entries(response.data?.data?.values).forEach(
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
			if (response.data?.data?.values?.relatedValues) {
				response.data.data.relatedValues =
					response.data?.data?.values?.relatedValues;
			}
		}

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getFieldValues;
