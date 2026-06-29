import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { JsmOpsConnection } from 'types/api/channels/jsmOps';

const getJsmOpsConnections = async (): Promise<
	SuccessResponseV2<JsmOpsConnection[]>
> => {
	try {
		const response = await axios.get<{ data: JsmOpsConnection[] }>(
			'/channels/jsmops/connections',
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getJsmOpsConnections;
