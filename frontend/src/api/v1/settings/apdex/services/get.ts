import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	ApDexPayloadAndSettingsProps,
	PayloadProps,
} from 'types/api/metrics/getApDex';

const getApDexSettings = async (
	servicename: string,
): Promise<SuccessResponseV2<ApDexPayloadAndSettingsProps[]>> => {
	try {
		const response = await axios.get<PayloadProps>(
			`/settings/apdex?services=${servicename}`,
		);
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getApDexSettings;
