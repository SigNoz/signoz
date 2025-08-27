import { ApiBaseInstance } from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FieldKeyResponse } from 'types/api/dynamicVariables/getFieldKeys';

/**
 * Get field keys for a given signal type
 * @param signal Type of signal (traces, logs, metrics)
 * @param name Optional search text
 */
export const getFieldKeys = async (
	signal?: 'traces' | 'logs' | 'metrics',
	name?: string,
): Promise<SuccessResponse<FieldKeyResponse> | ErrorResponse> => {
	const params: Record<string, string> = {};

	if (signal) {
		params.signal = encodeURIComponent(signal);
	}

	if (name) {
		params.name = encodeURIComponent(name);
	}

	const response = await ApiBaseInstance.get('/fields/keys', { params });

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default getFieldKeys;
