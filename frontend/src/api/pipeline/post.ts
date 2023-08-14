import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Pipeline } from 'types/api/pipeline/def';
import { Props } from 'types/api/pipeline/post';

const post = async (
	props: Props,
): Promise<SuccessResponse<Pipeline> | ErrorResponse> => {
	try {
		const response = await axios.post('/logs/pipelines', props.data);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default post;
