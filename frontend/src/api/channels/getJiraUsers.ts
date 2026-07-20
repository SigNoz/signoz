import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import {
	JiraUsersRequest,
	JiraUsersResponse,
} from 'types/api/channels/jiraProjects';

export const fetchJiraUsers = async (
	props: JiraUsersRequest,
): Promise<SuccessResponseV2<JiraUsersResponse>> => {
	try {
		const response = await axios.post<RawSuccessResponse<JiraUsersResponse>>(
			'/channels/jira/users',
			props,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
