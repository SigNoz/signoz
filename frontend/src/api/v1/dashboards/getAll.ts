import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { Dashboard, PayloadProps } from 'types/api/dashboard/getAll';

const getAll = async (): Promise<SuccessResponseV2<Dashboard[]>> => {
	try {
		const response = await axios.get<PayloadProps>('/dashboards');
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getAll;
