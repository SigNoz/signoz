/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RulestatehistorytypesGettableRuleStateHistoryDTO } from './rulestatehistorytypesGettableRuleStateHistoryDTO';

export interface RulestatehistorytypesGettableRuleStateTimelineDTO {
	/**
	 * @type array,null
	 */
	items: RulestatehistorytypesGettableRuleStateHistoryDTO[] | null;
	/**
	 * @type string
	 */
	nextCursor?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	total: number;
}
