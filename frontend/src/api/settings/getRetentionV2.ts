import { ApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/settings/getRetention';

// Only works for logs
const getRetentionV2 = async (): Promise<
	SuccessResponse<PayloadProps<'logs'>> | ErrorResponse
> => {
	try {
		const response = await ApiV2Instance.get<PayloadProps<'logs'>>(
			`/settings/ttl`,
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

export default getRetentionV2;
