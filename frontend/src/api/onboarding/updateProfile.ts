import { GatewayApiV2Instance } from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { UpdateProfileProps } from 'types/api/onboarding/types';

const updateProfile = async (
	props: UpdateProfileProps,
): Promise<SuccessResponse<UpdateProfileProps> | ErrorResponse> => {
	const response = await GatewayApiV2Instance.put('/profiles/me', {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateProfile;
