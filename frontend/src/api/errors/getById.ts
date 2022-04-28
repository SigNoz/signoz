import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/errors/getById';

const getById = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/errorWithId?${createQueryParams({
				start: props.start.toString(),
				end: props.end.toString(),
				errorId: props.errorId,
			})}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.message,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getById;
