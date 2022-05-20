import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/settings/setRetention';

const setRetention = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post<PayloadProps>(
			`/settings/ttl?duration=${props.totalDuration}&type=${props.type}${
				props.coldStorage
					? `&coldStorage=${props.coldStorage}&toColdDuration=${props.toColdDuration}`
					: ''
			}`,
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

export default setRetention;
