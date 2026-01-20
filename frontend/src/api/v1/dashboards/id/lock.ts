import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/dashboard/lockUnlock';

const lock = async (props: Props): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.put<PayloadProps>(
			`/dashboards/${props.id}/lock`,
			{ lock: props.lock },
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default lock;
