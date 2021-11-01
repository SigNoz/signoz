import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	PayloadProps,
	Props,
} from 'types/api/metrics/getExternalAverageDuration';

const getExternalAverageDuration = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/service/externalAvgDuration?&start=${props.start}&end=${props.end}&service=${props.service}&step=${props.step}`,
		);

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

export default getExternalAverageDuration;
