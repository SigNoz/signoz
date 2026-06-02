import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	WaterfallAggregationRequest,
	WaterfallAggregationResponse,
} from 'types/api/trace/getTraceV3';

interface GetTraceAggregationsProps {
	traceId: string;
	aggregations: WaterfallAggregationRequest[];
}

const getTraceAggregations = async ({
	traceId,
	aggregations,
}: GetTraceAggregationsProps): Promise<
	SuccessResponseV2<WaterfallAggregationResponse[]>
> => {
	try {
		const response = await axios.post(`/traces/${traceId}/aggregations`, {
			aggregations,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data.aggregations,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getTraceAggregations;
