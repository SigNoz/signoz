import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertRuleTopContributorsPayload } from 'types/api/alerts/def';
import { TopContributorsProps } from 'types/api/alerts/topContributors';

const topContributors = async (
	props: TopContributorsProps,
): Promise<
	SuccessResponse<AlertRuleTopContributorsPayload> | ErrorResponse
> => {
	try {
		const response = await axios.post(
			`/rules/${props.id}/history/top_contributors`,
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

export default topContributors;
