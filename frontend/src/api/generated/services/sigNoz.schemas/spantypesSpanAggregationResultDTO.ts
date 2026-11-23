/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesSpanAggregationResultDTOValue } from './spantypesSpanAggregationResultDTOValue';
import type { SpantypesSpanAggregationTypeDTO } from './spantypesSpanAggregationTypeDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface SpantypesSpanAggregationResultDTO {
	aggregation: SpantypesSpanAggregationTypeDTO;
	field: TelemetrytypesTelemetryFieldKeyDTO;
	/**
	 * @type object,null
	 */
	value: SpantypesSpanAggregationResultDTOValue;
}
