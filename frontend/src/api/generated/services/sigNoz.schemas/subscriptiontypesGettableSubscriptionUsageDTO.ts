/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SubscriptiontypesSubscriptionUsageDetailsDTO } from './subscriptiontypesSubscriptionUsageDetailsDTO';

export interface SubscriptiontypesGettableSubscriptionUsageDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	billingPeriodEnd?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	billingPeriodStart?: number;
	details?: SubscriptiontypesSubscriptionUsageDetailsDTO;
	/**
	 * @type number
	 * @format double
	 */
	discount?: number;
	/**
	 * @type string
	 */
	subscriptionStatus?: string;
}
