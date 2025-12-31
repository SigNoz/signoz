import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	GlobalConfigData,
	GlobalConfigDataProps,
} from 'types/api/globalConfig/types';

const getGlobalConfig = async (): Promise<
	SuccessResponseV2<GlobalConfigData>
> => {
	try {
		const response = await axios.get<GlobalConfigDataProps>(`/global/config`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getGlobalConfig;
