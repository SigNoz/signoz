import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetOrgPreferenceResponseProps } from 'types/api/preferences/userOrgPreferences';

const getOrgPreference = async ({
	preferenceID,
}: {
	preferenceID: string;
}): Promise<SuccessResponse<GetOrgPreferenceResponseProps> | ErrorResponse> => {
	const response = await axios.get(`/org/preferences/${preferenceID}`);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default getOrgPreference;
