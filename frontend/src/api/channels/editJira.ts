import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponse, ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/editJira';

/**
 * @deprecated Use the generated `useUpdateChannelByID` hook (or `updateChannelByID` fetcher) from
 * `api/generated/services/channels` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const editJira = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps> | ErrorResponse> => {
	try {
		const reopenDuration = props.reopen_duration?.trim();
		const response = await axios.put<PayloadProps>(`/channels/${props.id}`, {
			name: props.name,
			jira_configs: [
				{
					connection_id: props.connection_id,
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
					send_resolved: props.send_resolved,
				},
			],
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default editJira;
