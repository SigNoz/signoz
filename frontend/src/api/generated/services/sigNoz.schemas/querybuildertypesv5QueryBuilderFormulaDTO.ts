/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5BucketOptionsDTO } from './querybuildertypesv5BucketOptionsDTO';
import type { Querybuildertypesv5FunctionDTO } from './querybuildertypesv5FunctionDTO';
import type { Querybuildertypesv5HavingDTO } from './querybuildertypesv5HavingDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';

export interface Querybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @description The value axis to count the formula result into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the formula may still be evaluated. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description An arithmetic expression over builder query names, for example A / B * 100. Reference queries, not other formulas.
	 */
	expression?: string;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @description A filter on the formula values, referencing the formula by its name or as __result, for example F1 > 0. A time series keeps only the points that match and drops a series with none left; a scalar result keeps only the rows that match.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of series or rows to return. Unlimited when 0.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The unique name of the formula, such as F1, used by selectedQueryName and by panels. Referencing a formula from another formula is not reliable.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of ordered series or rows to skip before the page starts. Requires limit.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the formula result.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
}
