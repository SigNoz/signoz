/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5GroupByKeyDTO } from './querybuildertypesv5GroupByKeyDTO';
import type { Querybuildertypesv5LimitByDTO } from './querybuildertypesv5LimitByDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';
import type { Querybuildertypesv5StepDTO } from './querybuildertypesv5StepDTO';

export interface Querybuildertypesv5SecondaryAggregationDTO {
	/**
	 * @type string
	 * @description The name the aggregation is reported under; when omitted, the result carries the alias __result_N, with N the zero-based index of the aggregation.
	 */
	alias?: string;
	/**
	 * @type string
	 * @description The aggregation over the primary results, such as count(), sum(item_price) or countIf(day > 10).
	 */
	expression?: string;
	/**
	 * @type array,null
	 * @description The fields to group this aggregation by.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @type integer
	 * @description The maximum number of groups to return. Unlimited when 0.
	 */
	limit?: number;
	/**
	 * @description Applies limit within each distinct combination of the given keys.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type array,null
	 * @description The sort order of this aggregation result.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @description The time bucket for this aggregation: seconds as a number or a Go duration string. Uses the primary aggregation step when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}
