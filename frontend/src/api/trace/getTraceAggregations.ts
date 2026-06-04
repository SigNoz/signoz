import {
	SpantypesSpanAggregationDTO,
	SpantypesSpanAggregationResultDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getTraceAggregations as fetchTraceAggregations } from 'api/generated/services/tracedetail';
import { SuccessResponseV2 } from 'types/api';

interface GetTraceAggregationsProps {
	traceId: string;
	aggregations: SpantypesSpanAggregationDTO[];
}

const getTraceAggregations = async ({
	traceId,
	aggregations,
}: GetTraceAggregationsProps): Promise<
	SuccessResponseV2<SpantypesSpanAggregationResultDTO[]>
> => {
	const response = await fetchTraceAggregations(
		{ traceID: traceId },
		{ aggregations },
	);

	return {
		httpStatusCode: 200,
		data: response.data.aggregations,
	};
};

export default getTraceAggregations;
