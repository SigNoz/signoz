/* eslint-disable @typescript-eslint/no-throw-literal */
import { GatewayApiV1Instance } from 'api';
import axios, { AxiosError } from 'axios';
import {
	LimitProps,
	LimitSuccessProps,
} from 'types/api/ingestionKeys/limits/types';

interface SuccessResponse<T> {
	statusCode: number;
	error: null;
	message: string;
	payload: T;
}

interface ErrorResponse {
	statusCode: number;
	error: string;
	message: string;
	payload: null;
}

const createLimitForIngestionKey = async (
	props: LimitProps,
): Promise<SuccessResponse<LimitSuccessProps> | AxiosError> => {
	try {
		const response = await GatewayApiV1Instance.post(
			`/workspaces/me/keys/${props.keyId}/limits`,
			{
				...props,
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.log('error', error);

			// Axios error
			const errResponse: ErrorResponse = {
				statusCode: error.response?.status || 500,
				error: error.response?.data?.error,
				message: error.response?.data?.status || 'An error occurred',
				payload: null,
			};

			throw errResponse;
		} else {
			// Non-Axios error
			const errResponse: ErrorResponse = {
				statusCode: 500,
				error: 'Unknown error',
				message: 'An unknown error occurred',
				payload: null,
			};

			throw errResponse;
		}
	}
};

export default createLimitForIngestionKey;
