import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import store from 'store';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	Props,
	VariableResponseProps,
} from 'types/api/dashboard/variables/query';

const dashboardVariablesQuery = async (
	props: Props,
): Promise<SuccessResponse<VariableResponseProps> | ErrorResponse> => {
	try {
		const { globalTime } = store.getState();
		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: globalTime.selectedTime,
		});

		const timeVariables: Record<string, number> = {
			start_timestamp_ms: parseInt(start, 10) * 1e3,
			end_timestamp_ms: parseInt(end, 10) * 1e3,
			start_timestamp_nano: parseInt(start, 10) * 1e9,
			end_timestamp_nano: parseInt(end, 10) * 1e9,
			start_timestamp: parseInt(start, 10),
			end_timestamp: parseInt(end, 10),
		};

		const payload = { ...props };

		payload.variables = { ...payload.variables, ...timeVariables };

		const response = await axios.post(`/variables/query`, payload);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		const formattedError = ErrorResponseHandler(error as AxiosError);

		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw { message: 'Error fetching data', details: formattedError };
	}
};

export default dashboardVariablesQuery;
