/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SubscriptiontypesSubscriptionUsageDayWiseBreakdownDTO } from './subscriptiontypesSubscriptionUsageDayWiseBreakdownDTO';
import type { SubscriptiontypesSubscriptionUsageTierDTO } from './subscriptiontypesSubscriptionUsageTierDTO';

export interface SubscriptiontypesSubscriptionUsageBreakdownDTO {
	dayWiseBreakdown?: SubscriptiontypesSubscriptionUsageDayWiseBreakdownDTO;
	/**
	 * @type array,null
	 */
	tiers?: SubscriptiontypesSubscriptionUsageTierDTO[] | null;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
}
