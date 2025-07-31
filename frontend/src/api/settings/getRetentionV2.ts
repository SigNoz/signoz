import { ApiV2Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps } from 'types/api/settings/getRetention';

// Only works for logs
const getRetentionV2 = async (): Promise<
	SuccessResponseV2<PayloadProps<'logs'>>
> => {
	try {
		const response = await ApiV2Instance.get<PayloadProps<'logs'>>(
			`/settings/ttl`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getRetentionV2;
