/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	BreakdownEntry,
	DayBreakdownEntry,
	UsageResponsePayloadProps,
} from 'api/billing/getUsage';
import type { TrialInfo } from 'types/api/licensesV3/getActive';

export const SUBSCRIPTION_STATUSES = ['active', 'past_due'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLED_DAYS_MAX = 31;

const DAY_IN_SECONDS = 24 * 60 * 60;

/**
 * The graph plots one bar per day of the period, so the period has to end in the
 * future for the header to report days remaining rather than zero.
 */
const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

interface SignalSeed {
	type: string;
	unit: string;
	/** Per-day quantity, which the tiers and the bars are both derived from. */
	perDay: number;
	unitPrice: number;
}

const SIGNALS: SignalSeed[] = [
	{ type: 'Logs', unit: 'GB', perDay: 42, unitPrice: 0.3 },
	{ type: 'Traces', unit: 'GB', perDay: 18, unitPrice: 0.3 },
	{ type: 'Metrics', unit: 'mn samples', perDay: 96, unitPrice: 0.1 },
];

const dayWiseBreakdown = (
	seed: SignalSeed,
	days: number,
	periodStart: number,
): DayBreakdownEntry[] =>
	Array.from({ length: days }, (_, index) => {
		// A fixed wobble per day, so the bars are not a flat block and the same
		// story renders the same graph every time.
		const quantity = seed.perDay * (1 + ((index % 5) - 2) / 10);

		return {
			// Unix seconds: the graph adds a bare 86400 to space a single-day series.
			timestamp: periodStart + index * DAY_IN_SECONDS,
			total: Number((quantity * seed.unitPrice).toFixed(2)),
			quantity: Number(quantity.toFixed(2)),
			count: Math.round(quantity),
			size: Math.round(quantity),
		};
	});

const breakdownFor = (
	seed: SignalSeed,
	days: number,
	periodStart: number,
): BreakdownEntry => {
	const quantity = Number((seed.perDay * days).toFixed(2));

	return {
		type: seed.type,
		unit: seed.unit,
		dayWiseBreakdown: { breakdown: dayWiseBreakdown(seed, days, periodStart) },
		tiers: [
			{
				quantity,
				unitPrice: seed.unitPrice,
				tierCost: Number((quantity * seed.unitPrice).toFixed(2)),
			},
		],
	};
};

export const usageResponse = (
	days: number,
	subscriptionStatus: SubscriptionStatus,
): UsageResponsePayloadProps => {
	const periodStart = nowInSeconds() - days * DAY_IN_SECONDS;
	const periodEnd = periodStart + BILLED_DAYS_MAX * DAY_IN_SECONDS;

	const breakdown = SIGNALS.map((seed) => breakdownFor(seed, days, periodStart));

	const billTotal = Number(
		breakdown
			.reduce((total, entry) => total + (entry.tiers?.[0]?.tierCost ?? 0), 0)
			.toFixed(2),
	);

	return {
		billingPeriodStart: periodStart,
		billingPeriodEnd: periodEnd,
		details: { total: billTotal, baseFee: 0, breakdown, billTotal },
		discount: 0,
		subscriptionStatus,
	};
};

export const checkoutResponse = (): Record<string, unknown> => ({
	status: 'success',
	data: { redirectURL: 'https://billing.signoz.local/checkout/storybook' },
});

export const PLAN_STATES = ['subscribed', 'on-trial', 'grace-period'] as const;

export type PlanState = (typeof PLAN_STATES)[number];

/**
 * `-1` is the backend's "not set" for every field here. `gracePeriodEnd` is read
 * for truthiness rather than compared, so leaving the sentinel in place puts the
 * grace-period callout up with a 1970 date: see the story's PR.
 */
const NOT_SET = -1;

export const trialInfoFor = (plan: PlanState): TrialInfo => {
	const now = nowInSeconds();

	switch (plan) {
		case 'on-trial':
			return {
				trialStart: now - 21 * DAY_IN_SECONDS,
				trialEnd: now + 9 * DAY_IN_SECONDS,
				onTrial: true,
				workSpaceBlock: false,
				trialConvertedToSubscription: false,
				gracePeriodEnd: NOT_SET,
			};

		case 'grace-period':
			return {
				trialStart: now - 45 * DAY_IN_SECONDS,
				trialEnd: now - 15 * DAY_IN_SECONDS,
				onTrial: false,
				workSpaceBlock: false,
				trialConvertedToSubscription: false,
				gracePeriodEnd: now + 7 * DAY_IN_SECONDS,
			};

		default:
			return {
				trialStart: now - 120 * DAY_IN_SECONDS,
				trialEnd: now - 90 * DAY_IN_SECONDS,
				onTrial: false,
				workSpaceBlock: false,
				trialConvertedToSubscription: true,
				gracePeriodEnd: NOT_SET,
			};
	}
};
