import axios from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';

/**
 * Get field values for a given signal type and field name
 * @param signal Type of signal (traces, logs, metrics)
 * @param name Name of the attribute for which values are being fetched
 * @param value Optional search text
 */
export const getFieldValues = async (
	signal: 'traces' | 'logs' | 'metrics',
	name: string,
	value?: string,
): Promise<SuccessResponse<FieldValueResponse> | ErrorResponse> => {
	const params: Record<string, string> = { signal, name };

	if (value) {
		params.value = value;
	}

	const response = await axios.get('/fields/values', { params });

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default getFieldValues;
