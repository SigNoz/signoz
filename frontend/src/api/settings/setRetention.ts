import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadPropsV2, Props } from 'types/api/settings/setRetention';

const setRetention = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadPropsV2>> => {
	try {
		const response = await axios.post<PayloadPropsV2>(
			`/settings/ttl?duration=${props.totalDuration}&type=${props.type}${
				props.coldStorage
					? `&coldStorage=${props.coldStorage}&toColdDuration=${props.toColdDuration}`
					: ''
			}`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default setRetention;
