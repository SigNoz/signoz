import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { JiraConnection } from 'types/api/channels/jiraConnections';

const getJiraConnections = async (): Promise<
	SuccessResponseV2<JiraConnection[]>
> => {
	try {
		const response = await axios.get<{ data: JiraConnection[] }>(
			'/channels/jira/connections',
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

export default getJiraConnections;
