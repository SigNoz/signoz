import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	FeatureFlagProps,
	PayloadProps,
} from 'types/api/features/getFeaturesFlags';

const list = async (): Promise<SuccessResponseV2<FeatureFlagProps[]>> => {
	try {
		const response = await axios.get<PayloadProps>(`/features`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default list;
