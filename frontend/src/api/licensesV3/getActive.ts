import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LicenseV3EventQueueResModel } from 'types/api/licensesV3/getActive';

const getActive = async (): Promise<
	SuccessResponse<LicenseV3EventQueueResModel> | ErrorResponse
> => {
	try {
		const response = await axios.get('/licenses/active');

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

export default getActive;
