import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';

const deleteAPIKey = async (id: string): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.delete(`/pats/${id}`);

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default deleteAPIKey;
