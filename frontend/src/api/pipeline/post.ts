import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import type { AxiosError } from 'axios';
import type { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import type { Pipeline } from 'types/api/pipeline/def';
import type { Props } from 'types/api/pipeline/post';

const post = async (props: Props): Promise<SuccessResponseV2<Pipeline>> => {
	try {
		const response = await axios.post('/logs/pipelines', props.data);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default post;
