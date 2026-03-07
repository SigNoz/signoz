import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/dashboard/create';
import { Dashboard } from 'types/api/dashboard/getAll';

const create = async (props: Props): Promise<SuccessResponseV2<Dashboard>> => {
	try {
		const response = await axios.post<PayloadProps>('/dashboards', {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default create;
