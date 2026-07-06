import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createJira';

/**
 * @deprecated Targets the deprecated `/testChannel` endpoint. No generated replacement
 * exists yet; migrate this once one is added to `api/generated/services/channels`.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const testJira = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const httpConfig =
			props.username && props.password
				? {
						basic_auth: {
							username: props.username.trim(),
							password: props.password.trim(),
						},
					}
				: undefined;

		const reopenDuration = props.reopen_duration?.trim();
		const response = await axios.post<PayloadProps>('/testChannel', {
			name: props.name,
			jira_configs: [
				{
					api_url: props.api_url,
					api_type: 'auto',
					http_config: httpConfig,
					project: props.project,
					issue_type: props.issue_type,
					summary: { template: props.summary },
					description: { template: props.description },
					priority: props.priority,
					labels: props.labels
						?.split(',')
						.map((label) => label.trim())
						.filter(Boolean),
					custom_fields: props.custom_fields,
					reopen_transition: props.reopen_transition,
					...(reopenDuration ? { reopen_duration: reopenDuration } : {}),
					resolve_transition: props.resolve_transition,
					wont_fix_resolution: props.wont_fix_resolution,
					send_resolved: true,
				},
			],
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default testJira;
