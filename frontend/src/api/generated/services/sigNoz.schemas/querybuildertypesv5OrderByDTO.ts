/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5OrderByKeyDTO } from './querybuildertypesv5OrderByKeyDTO';
import type { Querybuildertypesv5OrderDirectionDTO } from './querybuildertypesv5OrderDirectionDTO';

export interface Querybuildertypesv5OrderByDTO {
	/**
	 * @description The sort direction: asc or desc.
	 */
	direction?: Querybuildertypesv5OrderDirectionDTO;
	/**
	 * @description The sort key. For aggregation requests name is a group-by field such as service.name, an aggregation alias, or the aggregation expression: count() or p99(duration_nano) for traces and logs; for metrics the spaceAggregation(timeAggregation(metricName)) form such as sum(rate(signoz_calls_total)), p99(metricName) for histogram metrics, or __result. Raw requests sort by any field, such as timestamp.
	 */
	key?: Querybuildertypesv5OrderByKeyDTO;
}
