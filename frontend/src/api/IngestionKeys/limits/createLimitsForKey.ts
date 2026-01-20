/* eslint-disable @typescript-eslint/no-throw-literal */
import { GatewayApiV2Instance } from 'api';
import axios from 'axios';
import {
	AddLimitProps,
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
	props: AddLimitProps,
): Promise<SuccessResponse<LimitSuccessProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV2Instance.post(
			`/ingestion_keys/${props.keyID}/limits`,
			{
				signal: props.signal,
				config: props.config,
				tags: props.tags,
			},
		);

		return {
			statusCode: 201,
			error: null,
			message: 'success',
			payload: response.data,
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
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
