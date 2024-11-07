import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetAllUserPreferencesResponseProps } from 'types/api/preferences/userOrgPreferences';

const getAllUserPreferences = async (): Promise<
	SuccessResponse<GetAllUserPreferencesResponseProps> | ErrorResponse
> => {
	const response = await axios.get(`/user/preferences`);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data,
	};
};

export default getAllUserPreferences;
