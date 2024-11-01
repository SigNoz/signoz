import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetUserPreferenceResponseProps } from 'types/api/preferences/userOrgPreferences';

const getUserPreference = async ({
	preferenceID,
}: {
	preferenceID: string;
}): Promise<
	SuccessResponse<GetUserPreferenceResponseProps> | ErrorResponse
> => {
	const response = await axios.get(`/user/preferences/${preferenceID}`);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default getUserPreference;
