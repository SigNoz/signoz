import { ApiV3Instance as axios } from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LicenseV3EventQueueResModel } from 'types/api/licensesV3/getActive';

const getActive = async (): Promise<
	SuccessResponse<LicenseV3EventQueueResModel> | ErrorResponse
> => {
	const response = await axios.get('/licenses/active');

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default getActive;
