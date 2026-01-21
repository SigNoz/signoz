import { GatewayApiV2Instance } from 'api';
import axios from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreatedIngestionKeyProps,
	UpdateIngestionKeyProps,
} from 'types/api/ingestionKeys/types';
import { ErrorStatusCode } from 'types/common';

const updateIngestionKey = async (
	props: UpdateIngestionKeyProps,
): Promise<SuccessResponse<CreatedIngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV2Instance.patch(
			`/ingestion_keys/${props.id}`,
			{
				...props.data,
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: response.data,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const errResponse: ErrorResponse = {
				statusCode:
					(error.response?.status as ErrorStatusCode) || (500 as ErrorStatusCode),
				error: error.response?.data?.error?.message || 'Something went wrong',
				message: error.response?.data?.error?.message || 'An error occurred',
				payload: null,
			};
			throw errResponse;
		}
		throw {
			statusCode: 500,
			error: 'Unknown error',
			message: 'An unknown error occurred',
			payload: null,
		};
	}
};

export default updateIngestionKey;
