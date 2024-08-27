import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertRuleTimelineTableResponsePayload } from 'types/api/alerts/def';
import { GetTimelineTableRequestProps } from 'types/api/alerts/timelineTable';

const timelineTable = async (
	props: GetTimelineTableRequestProps,
): Promise<
	SuccessResponse<AlertRuleTimelineTableResponsePayload> | ErrorResponse
> => {
	try {
		const response = await axios.post(`/rules/${props.id}/history/timeline`, {
			start: props.start,
			end: props.end,
			offset: props.offset,
			limit: props.limit,
			order: props.order,
			state: props.state,
			// TODO(shaheer): implement filters
			filters: props.filters,
		});

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

export default timelineTable;
