import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	LicenseEventQueueResModel,
	PayloadProps,
} from 'types/api/licensesV3/getActive';

const getActive = async (): Promise<
	SuccessResponseV2<LicenseEventQueueResModel>
> => {
	try {
		const response = await axios.get<PayloadProps>('/licenses/active');

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getActive;
