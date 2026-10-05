/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	CreateSubscription201,
	GetSubscription200,
	SubscriptiontypesSubscriptionUsageBreakdownDTO,
	SubscriptiontypesSubscriptionUsageDayWiseDataDTO,
	SubscriptiontypesSubscriptionUsageTierDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { TrialInfo } from 'types/api/licensesV3/getActive';

export const SUBSCRIPTION_STATUSES = ['active', 'past_due'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PRICING_MODES = ['flat', 'volume-tiers'] as const;

export type PricingMode = (typeof PRICING_MODES)[number];

export const BILLED_DAYS_MAX = 31;

const DAY_IN_SECONDS = 24 * 60 * 60;

/**
 * The graph plots one bar per day of the period, so the period has to end in the
 * future for the header to report days remaining rather than zero.
 */
const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

interface VolumeStep {
	/** Cumulative quantity this price covers up to; the last step is unbounded. */
	upTo: number;
	unitPrice: number;
}

interface SignalSeed {
	type: string;
	unit: string;
	/** Per-day quantity, which the tiers and the bars are both derived from. */
	perDay: number;
	unitPrice: number;
	volume: VolumeStep[];
}

const SIGNALS: SignalSeed[] = [
	{
		type: 'Logs',
		unit: 'GB',
		perDay: 42,
		unitPrice: 0.3,
		volume: [
			{ upTo: 200, unitPrice: 0.3 },
			{ upTo: 500, unitPrice: 0.25 },
			{ upTo: Infinity, unitPrice: 0.2 },
		],
	},
	{
		type: 'Traces',
		unit: 'GB',
		perDay: 18,
		unitPrice: 0.3,
		volume: [
			{ upTo: 100, unitPrice: 0.3 },
			{ upTo: 300, unitPrice: 0.25 },
			{ upTo: Infinity, unitPrice: 0.2 },
		],
	},
	{
		type: 'Metrics',
		unit: 'mn samples',
		perDay: 96,
		unitPrice: 0.1,
		volume: [
			{ upTo: 500, unitPrice: 0.1 },
			{ upTo: 1500, unitPrice: 0.08 },
			{ upTo: Infinity, unitPrice: 0.06 },
		],
	},
];

const round = (value: number): number => Number(value.toFixed(2));

const dayWiseBreakdown = (
	seed: SignalSeed,
	days: number,
	periodStart: number,
): SubscriptiontypesSubscriptionUsageDayWiseDataDTO[] =>
	Array.from({ length: days }, (_, index) => {
		// A fixed wobble per day, so the bars are not a flat block and the same
		// story renders the same graph every time.
		const quantity = seed.perDay * (1 + ((index % 5) - 2) / 10);

		return {
			// Unix seconds: the graph adds a bare 86400 to space a single-day series.
			timestamp: periodStart + index * DAY_IN_SECONDS,
			total: round(quantity * seed.unitPrice),
			quantity: round(quantity),
			count: Math.round(quantity),
			size: Math.round(quantity),
		};
	});

const tier = (
	quantity: number,
	unitPrice: number,
): SubscriptiontypesSubscriptionUsageTierDTO => ({
	quantity: round(quantity),
	unitPrice,
	tierCost: round(quantity * unitPrice),
});

/**
 * The month's quantity walked down the signal's volume schedule, one tier per
 * price it crossed. The table gives every tier past the first its own row under
 * a blank signal name, so a workspace only shows them once it is over a step.
 */
const volumeTiers = (
	seed: SignalSeed,
	quantity: number,
): SubscriptiontypesSubscriptionUsageTierDTO[] => {
	const tiers: SubscriptiontypesSubscriptionUsageTierDTO[] = [];
	let remaining = quantity;
	let covered = 0;

	for (const step of seed.volume) {
		if (remaining <= 0) {
			break;
		}

		const span = Math.min(remaining, step.upTo - covered);

		tiers.push(tier(span, step.unitPrice));
		remaining -= span;
		covered = step.upTo;
	}

	return tiers;
};

const breakdownFor = (
	seed: SignalSeed,
	days: number,
	periodStart: number,
	pricing: PricingMode,
): SubscriptiontypesSubscriptionUsageBreakdownDTO => {
	const quantity = round(seed.perDay * days);

	return {
		type: seed.type,
		unit: seed.unit,
		dayWiseBreakdown: { breakdown: dayWiseBreakdown(seed, days, periodStart) },
		tiers:
			pricing === 'volume-tiers'
				? volumeTiers(seed, quantity)
				: [tier(quantity, seed.unitPrice)],
	};
};

const billTotalFor = (
	breakdown: SubscriptiontypesSubscriptionUsageBreakdownDTO[],
): number =>
	round(
		breakdown.reduce(
			(total, entry) =>
				total +
				(entry.tiers ?? []).reduce(
					(signalTotal, entryTier) => signalTotal + (entryTier.tierCost ?? 0),
					0,
				),
			0,
		),
	);

export const usageResponse = (
	days: number,
	subscriptionStatus: SubscriptionStatus,
	pricing: PricingMode,
): GetSubscription200 => {
	const periodStart = nowInSeconds() - days * DAY_IN_SECONDS;
	const periodEnd = periodStart + BILLED_DAYS_MAX * DAY_IN_SECONDS;

	const breakdown = SIGNALS.map((seed) =>
		breakdownFor(seed, days, periodStart, pricing),
	);

	return {
		status: 'success',
		data: {
			billingPeriodStart: periodStart,
			billingPeriodEnd: periodEnd,
			details: { baseFee: 0, breakdown, billTotal: billTotalFor(breakdown) },
			discount: 0,
			subscriptionStatus,
		},
	};
};

export const checkoutResponse = (): CreateSubscription201 => ({
	status: 'success',
	data: { redirectURL: 'https://billing.signoz.local/checkout/storybook' },
});

export const PLAN_STATES = [
	'subscribed',
	'on-trial',
	'trial-card-added',
	'grace-period',
	'workspace-blocked',
] as const;

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

		// `AppProvider` reads a card added mid-trial as both: the license has left
		// the evaluating states while `freeUntil` is still ahead.
		case 'trial-card-added':
			return {
				trialStart: now - 21 * DAY_IN_SECONDS,
				trialEnd: now + 9 * DAY_IN_SECONDS,
				onTrial: true,
				workSpaceBlock: false,
				trialConvertedToSubscription: true,
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

		// The same expired evaluation on cloud, where `AppProvider` also blocks the
		// workspace: the console keeps billing reachable and shuts the rest.
		case 'workspace-blocked':
			return {
				trialStart: now - 45 * DAY_IN_SECONDS,
				trialEnd: now - 15 * DAY_IN_SECONDS,
				onTrial: false,
				workSpaceBlock: true,
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
