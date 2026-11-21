/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesAttributesComponentEntryDTO } from './inframonitoringtypesAttributesComponentEntryDTO';
import type { InframonitoringtypesCheckTypeDTO } from './inframonitoringtypesCheckTypeDTO';
import type { InframonitoringtypesMetricsComponentEntryDTO } from './inframonitoringtypesMetricsComponentEntryDTO';
import type { InframonitoringtypesMissingAttributesComponentEntryDTO } from './inframonitoringtypesMissingAttributesComponentEntryDTO';
import type { InframonitoringtypesMissingMetricsComponentEntryDTO } from './inframonitoringtypesMissingMetricsComponentEntryDTO';

export interface InframonitoringtypesChecksDTO {
	/**
	 * @type array,null
	 */
	missingDefaultEnabledMetrics:
		| InframonitoringtypesMissingMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	missingOptionalMetrics:
		| InframonitoringtypesMissingMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	missingRequiredAttributes:
		| InframonitoringtypesMissingAttributesComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	presentDefaultEnabledMetrics:
		| InframonitoringtypesMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	presentOptionalMetrics: InframonitoringtypesMetricsComponentEntryDTO[] | null;
	/**
	 * @type array,null
	 */
	presentRequiredAttributes:
		| InframonitoringtypesAttributesComponentEntryDTO[]
		| null;
	/**
	 * @type boolean
	 */
	ready: boolean;
	type: InframonitoringtypesCheckTypeDTO;
}
