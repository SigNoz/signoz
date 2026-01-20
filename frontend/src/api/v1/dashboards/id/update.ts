import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import { PayloadProps, Props } from 'types/api/dashboard/update';

const update = async (props: Props): Promise<SuccessResponseV2<Dashboard>> => {
	try {
		const response = await axios.put<PayloadProps>(`/dashboards/${props.id}`, {
			...props.data,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default update;
