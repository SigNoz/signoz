/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesNodeConditionDTO } from './inframonitoringtypesNodeConditionDTO';
import type { InframonitoringtypesPodStatusDTO } from './inframonitoringtypesPodStatusDTO';

export interface InframonitoringtypesClusterFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByNodeReadiness?: InframonitoringtypesNodeConditionDTO[] | null;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}
