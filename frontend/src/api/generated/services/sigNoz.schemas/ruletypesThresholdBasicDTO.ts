/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesThresholdBasicDTOKind } from './ruletypesThresholdBasicDTOKind';
import type { RuletypesThresholdBasicDTOSpec } from './ruletypesThresholdBasicDTOSpec';

export interface RuletypesThresholdBasicDTO {
	/**
	 * @type string
	 * @enum basic
	 * @description The kind of threshold.
	 */
	kind: RuletypesThresholdBasicDTOKind;
	/**
	 * @description The basic threshold specification (array of thresholds).
	 */
	spec: RuletypesThresholdBasicDTOSpec;
}
