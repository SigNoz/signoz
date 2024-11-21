import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	UpdateOrgPreferenceProps,
	UpdateOrgPreferenceResponseProps,
} from 'types/api/preferences/userOrgPreferences';

const updateOrgPreference = async (
	preferencePayload: UpdateOrgPreferenceProps,
): Promise<
	SuccessResponse<UpdateOrgPreferenceResponseProps> | ErrorResponse
> => {
	const response = await axios.put(
		`/org/preferences/${preferencePayload.preferenceID}`,
		{
			preference_value: preferencePayload.value,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateOrgPreference;
