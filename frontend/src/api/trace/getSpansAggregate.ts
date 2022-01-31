import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpanAggregate';
import { TraceFilterEnum } from 'types/reducer/trace';

const getSpanAggregate = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const exclude: TraceFilterEnum[] = [];
		const preProps = {
			start: String(props.start),
			end: String(props.end),
			limit: props.limit,
			offset: props.offset,
		};

		const updatedSelectedTags = props.selectedTags.map((e) => ({
			Key: e.Key[0],
			Operator: e.Operator,
			Values: e.Values,
		}));

		const response = await axios.post<PayloadProps>(`/getFilteredSpans`, {
			...preProps,
			tags: updatedSelectedTags,
			...Object.fromEntries(
				props.preSelectedFilter ? new Map() : props.selectedFilter,
			),
			exclude,
		});

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

export default getSpanAggregate;
