import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { AtlassianConnection } from 'types/api/channels/atlassian';

const getAtlassianConnections = async (): Promise<
	SuccessResponseV2<AtlassianConnection[]>
> => {
	try {
		const response = await axios.get<{ data: AtlassianConnection[] }>(
			'/channels/atlassian/connections',
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getAtlassianConnections;
