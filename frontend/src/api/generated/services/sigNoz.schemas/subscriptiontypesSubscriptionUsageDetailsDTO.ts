/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SubscriptiontypesSubscriptionUsageBreakdownDTO } from './subscriptiontypesSubscriptionUsageBreakdownDTO';

export interface SubscriptiontypesSubscriptionUsageDetailsDTO {
	/**
	 * @type number
	 * @format double
	 */
	baseFee?: number;
	/**
	 * @type number
	 * @format double
	 */
	billTotal?: number;
	/**
	 * @type array,null
	 */
	breakdown?: SubscriptiontypesSubscriptionUsageBreakdownDTO[] | null;
	/**
	 * @type number
	 * @format double
	 */
	total?: number;
}
