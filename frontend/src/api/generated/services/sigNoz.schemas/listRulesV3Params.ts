/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesListOrderDTO } from './ruletypesListOrderDTO';
import type { RuletypesListSortDTO } from './ruletypesListSortDTO';

export type ListRulesV3Params = {
	/**
	 * @type string
	 * @description A filter expression over rule name, description, labels and other fields, at most 1024 characters. Empty matches every rule.
	 */
	query?: string;
	/**
	 * @type array
	 * @description Only return rules in these states: firing, pending, recovering, inactive, nodata or disabled. Empty means every state.
	 */
	states?: string[];
	/**
	 * @description The field to sort by: updated_at (the default), created_at, name, state or thresholds. Sorting by thresholds ranks each rule by its first threshold name.
	 */
	sort?: RuletypesListSortDTO;
	/**
	 * @description The sort direction: asc or desc (the default).
	 */
	order?: RuletypesListOrderDTO;
	/**
	 * @type integer
	 * @description The page size, 1 to 200. Defaults to 20 and larger values are clamped to 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of rules to skip before the page. Defaults to 0.
	 */
	offset?: number;
};
