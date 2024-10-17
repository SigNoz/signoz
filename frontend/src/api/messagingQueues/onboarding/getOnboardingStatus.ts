import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import axios, { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface OnboardingStatusResponse {
	status: string;
	data: {
		attribute?: string;
		error_message?: string;
		status?: string;
	}[];
}

const getOnboardingStatus = async (
	start: number,
	end: number,
): Promise<SuccessResponse<OnboardingStatusResponse> | ErrorResponse> => {
	const endpoint = '/messaging-queues/kafka/onboarding/consumers';
	const payload = {
		start,
		end,
	};

	try {
		const response = await axios.post<OnboardingStatusResponse>(
			endpoint,
			payload,
		);
		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getOnboardingStatus;
