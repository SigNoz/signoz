import type { SpantypesSpanAggregationResultDTO } from 'api/generated/services/sigNoz.schemas/spantypesSpanAggregationResultDTO';
import { SpantypesSpanAggregationTypeDTO } from 'api/generated/services/sigNoz.schemas/spantypesSpanAggregationTypeDTO';

export const AGGREGATIONS = {
	EXEC_TIME_PCT: SpantypesSpanAggregationTypeDTO.execution_time_percentage,
	SPAN_COUNT: SpantypesSpanAggregationTypeDTO.span_count,
	DURATION: SpantypesSpanAggregationTypeDTO.duration,
} as const;

export function getAggregationMap(
	aggregations: SpantypesSpanAggregationResultDTO[] | undefined,
	type: SpantypesSpanAggregationTypeDTO,
	fieldName: string,
): Record<string, number> | null | undefined {
	return aggregations?.find(
		(a) => a.aggregation === type && a.field.name === fieldName,
	)?.value;
}
