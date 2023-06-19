import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import omitBy from 'lodash-es/omitBy';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getSpanAggregate';
import { TraceFilterEnum } from 'types/reducer/trace';

const getSpanAggregate = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const preProps = {
			start: String(props.start),
			end: String(props.end),
			limit: props.limit,
			offset: props.offset,
			order: props.order,
			orderParam: props.orderParam,
		};

		const exclude: TraceFilterEnum[] = [];

		props.isFilterExclude.forEach((value, key) => {
			if (value) {
				exclude.push(key);
			}
		});

		const updatedSelectedTags = props.selectedTags.map((e) => ({
			Key: `${e.Key}.(string)`,
			Operator: e.Operator,
			StringValues: e.StringValues,
			NumberValues: e.NumberValues,
			BoolValues: e.BoolValues,
		}));

		const other = Object.fromEntries(props.selectedFilter);

		const duration = omitBy(other, (_, key) => !key.startsWith('duration')) || [];

		const nonDuration = omitBy(other, (_, key) => key.startsWith('duration'));

		const response = await axios.post<PayloadProps>(`/getFilteredSpans`, {
			...preProps,
			tags: updatedSelectedTags,
			...nonDuration,
			maxDuration: String((duration.duration || [])[0] || ''),
			minDuration: String((duration.duration || [])[1] || ''),
			exclude,
			spanKind: props.spanKind,
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
