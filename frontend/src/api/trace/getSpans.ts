import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpans';

const getSpans = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const updatedSelectedTags = props.selectedTags.map((e) => ({
			Key: e.Key[0],
			Operator: e.Operator,
			Values: e.Values,
		}));

		const response = await axios.post<PayloadProps>(
			`/getFilteredSpans/aggregates`,
			{
				start: String(props.start),
				end: String(props.end),
				function: props.function,
				groupBy: props.groupBy,
				step: props.step,
				tags: updatedSelectedTags,
				...Object.fromEntries(
					props.preSelectedFilter ? new Map() : props.selectedFilter,
				),
			},
		);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getSpans;
