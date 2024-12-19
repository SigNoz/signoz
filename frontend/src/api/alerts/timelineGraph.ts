import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertRuleTimelineGraphResponsePayload } from 'types/api/alerts/def';
import { GetTimelineGraphRequestProps } from 'types/api/alerts/timelineGraph';

const timelineGraph = async (
	props: GetTimelineGraphRequestProps,
): Promise<
	SuccessResponse<AlertRuleTimelineGraphResponsePayload> | ErrorResponse
> => {
	try {
		const response = await axios.post(
			`/rules/${props.id}/history/overall_status`,
			{
				start: props.start,
				end: props.end,
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default timelineGraph;
