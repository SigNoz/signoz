import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface JiraWebhookUrlResponse {
	webhook_url: string;
	org_id: string;
	is_localhost?: boolean;
	note?: string;
}

const getJiraWebhookUrl = async (): Promise<
	SuccessResponse<JiraWebhookUrlResponse> | ErrorResponse
> => {
	try {
		const response = await axios.get<JiraWebhookUrlResponse>(
			'/webhooks/jira/url',
		);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return {
			statusCode: 500,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'Failed to get Jira webhook URL',
			payload: null,
		};
	}
};

export default getJiraWebhookUrl;
