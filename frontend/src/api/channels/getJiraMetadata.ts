import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import {
	JiraMetadataRequest,
	JiraMetadataResponse,
} from 'types/api/channels/jiraMetadata';

const jiraMetadata = async (
	props: JiraMetadataRequest,
): Promise<SuccessResponseV2<JiraMetadataResponse>> => {
	try {
		const response = await axios.post<RawSuccessResponse<JiraMetadataResponse>>(
			'/channels/jira/metadata',
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

export default jiraMetadata;
