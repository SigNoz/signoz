import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { FieldKeyResponse } from 'types/api/dynamicVariables/getFieldKeys';

/**
 * Get field keys for a given signal type
 * @param signal Type of signal (traces, logs, metrics)
 * @param name Optional search text
 */
export const getFieldKeys = async (
	signal?: 'traces' | 'logs' | 'metrics',
	name?: string,
): Promise<SuccessResponseV2<FieldKeyResponse>> => {
	const params: Record<string, string> = {};

	if (signal) {
		params.signal = encodeURIComponent(signal);
	}

	if (name) {
		params.name = encodeURIComponent(name);
	}

	try {
		const response = await axios.get('/fields/keys', { params });

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getFieldKeys;
