import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	GetSpanPercentilesProps,
	GetSpanPercentilesResponsePayloadProps,
} from 'types/api/trace/getSpanPercentiles';

const getSpanPercentiles = async (
	props: GetSpanPercentilesProps,
): Promise<
	SuccessResponse<GetSpanPercentilesResponsePayloadProps> | ErrorResponse
> => {
	try {
		const response = await ApiBaseInstance.post('/span-percentile/', {
			...props,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getSpanPercentiles;
