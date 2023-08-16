import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import omitBy from 'lodash-es/omitBy';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpans';

const getSpans = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const updatedSelectedTags = props.selectedTags.map((e) => ({
			Key: `${e.Key}.(string)`,
			Operator: e.Operator,
			StringValues: e.StringValues,
			NumberValues: e.NumberValues,
			BoolValues: e.BoolValues,
		}));

		const exclude: string[] = [];

		props.isFilterExclude.forEach((value, key) => {
			if (value) {
				exclude.push(key);
			}
		});

		const other = Object.fromEntries(props.selectedFilter);

		const duration = omitBy(other, (_, key) => !key.startsWith('duration')) || [];

		const nonDuration = omitBy(other, (_, key) => key.startsWith('duration'));

		const response = await axios.post<PayloadProps>(
			`/getFilteredSpans/aggregates`,
			{
				start: String(props.start),
				end: String(props.end),
				function: props.function,
				groupBy: props.groupBy === 'none' ? '' : props.groupBy,
				step: props.step,
				tags: updatedSelectedTags,
				...nonDuration,
				maxDuration: String((duration.duration || [])[0] || ''),
				minDuration: String((duration.duration || [])[1] || ''),
				exclude,
				spanKind: props.spanKind,
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
