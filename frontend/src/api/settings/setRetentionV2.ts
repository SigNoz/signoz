import { ApiV2Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadPropsV2, PropsV2 } from 'types/api/settings/setRetention';

const setRetentionV2 = async ({
	type,
	defaultTTLDays,
	coldStorageVolume,
	coldStorageDurationDays,
	ttlConditions,
}: PropsV2): Promise<SuccessResponseV2<PayloadPropsV2>> => {
	try {
		const response = await ApiV2Instance.post<PayloadPropsV2>(`/settings/ttl`, {
			type,
			defaultTTLDays,
			coldStorageVolume,
			coldStorageDurationDays,
			ttlConditions,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default setRetentionV2;
