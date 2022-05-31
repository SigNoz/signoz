import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/settings/getRetention';

const getRetention = async <T extends Props>(
	props: T,
): Promise<SuccessResponse<PayloadProps<T>> | ErrorResponse> => {
	try {
		const response = await axios.get<PayloadProps<T>>(
			`/settings/ttl?type=${props}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getRetention;
