/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5LabelDTOValue } from './querybuildertypesv5LabelDTOValue';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface Querybuildertypesv5LabelDTO {
	/**
	 * @description The group-by field this label value belongs to.
	 */
	key?: TelemetrytypesTelemetryFieldKeyDTO;
	/**
	 * @description The label value as a string, number or boolean.
	 */
	value?: Querybuildertypesv5LabelDTOValue;
}
