import { GatewayApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { UpdateProfileProps } from 'types/api/onboarding/types';

const updateProfile = async (
	props: UpdateProfileProps,
): Promise<SuccessResponse<UpdateProfileProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV2Instance.put('/profiles/me', {
			...props,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default updateProfile;
