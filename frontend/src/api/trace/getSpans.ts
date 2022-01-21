import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import convertObjectIntoParams from 'lib/query/convertObjectIntoParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpans';

const getSpans = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const preProps = {
			start: props.start,
			end: props.end,
			function: props.function,
			groupBy: props.groupBy,
			step: props.step,
		};

		const updatedQueryParams = `${convertObjectIntoParams(preProps)}`;

		const updatedSelectedTags = props.selectedTags.map((e) => ({
			Key: e.Key[0],
			Operator: e.Operator,
			Values: e.Values,
		}));

		const response = await axios.get<PayloadProps>(
			`/getFilteredSpans/aggregates?${updatedQueryParams}&tags=${encodeURIComponent(
				JSON.stringify(updatedSelectedTags),
			)}&${convertObjectIntoParams(
				Object.fromEntries(props.selectedFilter),
				true,
			)}`,
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
