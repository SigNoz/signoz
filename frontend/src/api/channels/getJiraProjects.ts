import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import {
	JiraProjectIssueTypesRequest,
	JiraProjectIssueTypesResponse,
	JiraProjectsRequest,
	JiraProjectsResponse,
} from 'types/api/channels/jiraProjects';

export const fetchJiraProjects = async (
	props: JiraProjectsRequest,
): Promise<SuccessResponseV2<JiraProjectsResponse>> => {
	try {
		const response = await axios.post<RawSuccessResponse<JiraProjectsResponse>>(
			'/channels/jira/projects',
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

export const fetchJiraProjectIssueTypes = async (
	props: JiraProjectIssueTypesRequest,
): Promise<SuccessResponseV2<JiraProjectIssueTypesResponse>> => {
	try {
		const response = await axios.post<
			RawSuccessResponse<JiraProjectIssueTypesResponse>
		>('/channels/jira/project-issue-types', props);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
