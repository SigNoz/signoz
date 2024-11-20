import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetAllOrgPreferencesResponseProps } from 'types/api/preferences/userOrgPreferences';

const getAllOrgPreferences = async (): Promise<
	SuccessResponse<GetAllOrgPreferencesResponseProps> | ErrorResponse
> => {
	const response = await axios.get(`/org/preferences`);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default getAllOrgPreferences;
