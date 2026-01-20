/* eslint-disable @typescript-eslint/no-throw-literal */
import { GatewayApiV2Instance } from 'api';
import axios from 'axios';
import {
	LimitSuccessProps,
	UpdateLimitProps,
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

const updateLimitForIngestionKey = async (
	props: UpdateLimitProps,
): Promise<SuccessResponse<void> | ErrorResponse> => {
	try {
		await GatewayApiV2Instance.patch(`/ingestion_keys/limits/${props.limitID}`, {
			config: props.config,
			tags: props.tags,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: undefined,
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

export default updateLimitForIngestionKey;
