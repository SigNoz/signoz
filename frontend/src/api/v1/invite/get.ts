import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, PendingInvite } from 'types/api/user/getPendingInvites';

const get = async (): Promise<SuccessResponseV2<PendingInvite[]>> => {
	try {
		const response = await axios.get<PayloadProps>(`/invite`);
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default get;
