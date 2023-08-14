import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Pipeline } from 'types/api/pipeline/def';
import { Props } from 'types/api/pipeline/get';

const get = async (
	props: Props,
): Promise<SuccessResponse<Pipeline> | ErrorResponse> => {
	try {
		const response = await axios.get(`/logs/pipelines/${props.version}`);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response?.data?.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default get;
