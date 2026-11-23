/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesHostStatusDTO } from './inframonitoringtypesHostStatusDTO';

export interface InframonitoringtypesHostFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	filterByStatus?: InframonitoringtypesHostStatusDTO;
}
