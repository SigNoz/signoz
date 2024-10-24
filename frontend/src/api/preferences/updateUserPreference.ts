import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	UpdateUserPreferenceProps,
	UpdateUserPreferenceResponseProps,
} from 'types/api/preferences/userOrgPreferences';

const updateUserPreference = async (
	preferencePayload: UpdateUserPreferenceProps,
): Promise<
	SuccessResponse<UpdateUserPreferenceResponseProps> | ErrorResponse
> => {
	const response = await axios.put(`/user/preferences`, {
		preference_value: preferencePayload.value,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateUserPreference;
