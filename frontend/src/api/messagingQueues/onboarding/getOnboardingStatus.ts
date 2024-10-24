import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface OnboardingStatusResponse {
	status: string;
	data: {
		attribute?: string;
		error_message?: string;
		status?: string;
	}[];
}

const getOnboardingStatus = async (props: {
	start: number;
	end: number;
	endpointService?: string;
}): Promise<SuccessResponse<OnboardingStatusResponse> | ErrorResponse> => {
	const { endpointService, ...rest } = props;
	try {
		const response = await ApiBaseInstance.post(
			`/messaging-queues/kafka/onboarding/${endpointService || 'consumers'}`,
			rest,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler((error as AxiosError) || SOMETHING_WENT_WRONG);
	}
};

export default getOnboardingStatus;
