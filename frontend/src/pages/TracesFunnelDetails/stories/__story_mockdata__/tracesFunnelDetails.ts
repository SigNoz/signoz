/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	ErrorTraceData,
	FunnelOverviewResponse,
	FunnelStepsResponse,
	SlowTraceData,
} from 'api/traceFunnels';
import type { FunnelData, FunnelStepData } from 'types/api/traceFunnels';

export const FUNNEL_ID = 'funnel-checkout';

const AT = 1_766_000_000_000;

interface StepSeed {
	service: string;
	span: string;
	name: string;
	description: string;
}

const STEPS: StepSeed[] = [
	{
		service: 'frontend',
		span: 'POST /api/checkout',
		name: 'Checkout opened',
		description: 'The request that starts a checkout.',
	},
	{
		service: 'payment',
		span: 'payment.authorize',
		name: 'Payment authorised',
		description: 'The upstream authorisation call.',
	},
	{
		service: 'shipping',
		span: 'shipping.quote',
		name: 'Shipping quoted',
		description: 'The quote returned to the buyer.',
	},
	{
		service: 'checkout',
		span: 'order.persist',
		name: 'Order placed',
		description: 'The order written to the database.',
	},
];

export const FUNNEL_STEP_MAX = STEPS.length;

const step = (seed: StepSeed, index: number): FunnelStepData => ({
	id: `step-${index + 1}`,
	step_order: index + 1,
	service_name: seed.service,
	span_name: seed.span,
	filters: { items: [], op: 'AND' },
	latency_pointer: 'start',
	latency_type: 'p99',
	has_errors: false,
	name: seed.name,
	description: seed.description,
});

export const funnelResponse = (
	steps: number,
): { status: string; data: FunnelData } => ({
	status: 'success',
	data: {
		funnel_id: FUNNEL_ID,
		funnel_name: 'Checkout conversion',
		description: 'Where a checkout drops off between the cart and the order.',
		created_at: AT,
		updated_at: AT,
		user_email: 'anna@signoz.io',
		steps: STEPS.slice(0, steps).map(step),
	},
});

const timestamp = (index: number): string =>
	new Date(AT + index * 60_000).toISOString();

/**
 * Conversion falls off step by step, which is the whole point of the funnel:
 * the drop is what the graph and the transition metrics are read from.
 */
const spansAtStep = (
	entered: number,
	index: number,
	conversion: number,
): number => Math.round(entered * conversion ** index);

export const funnelStepsResponse = (
	steps: number,
	entered: number,
	conversion: number,
): FunnelStepsResponse => ({
	status: 'success',
	data: [
		{
			timestamp: timestamp(0),
			data: Object.fromEntries(
				Array.from({ length: steps }, (_unused, index) => [
					[`total_s${index + 1}_spans`, spansAtStep(entered, index, conversion)],
					[
						`total_s${index + 1}_errored_spans`,
						Math.round(spansAtStep(entered, index, conversion) * 0.03),
					],
				]).flat() as Array<[string, number]>,
			),
		},
	],
});

export const funnelOverviewResponse = (
	entered: number,
	conversion: number,
	steps: number,
): FunnelOverviewResponse => ({
	status: 'success',
	data: [
		{
			timestamp: timestamp(0),
			data: {
				avg_duration: 1_840,
				avg_rate: 4.2,
				conversion_rate: Number((conversion ** (steps - 1) * 100).toFixed(2)),
				errors: Math.round(entered * 0.03),
				latency: 2_460,
			},
		},
	],
});

/** The per-transition numbers, keyed the way the metrics list reads them. */
export const funnelStepsOverviewResponse = (
	conversion: number,
): {
	status: string;
	data: Array<{ timestamp: string; data: Record<string, number> }>;
} => ({
	status: 'success',
	data: [
		{
			timestamp: timestamp(0),
			data: {
				avg_duration: 640,
				avg_rate: 3.8,
				conversion_rate: Number((conversion * 100).toFixed(2)),
				errors: 42,
				latency: 910,
			},
		},
	],
});

/** A 32-hex id, derived from the row so a refetch lists the same traces. */
const traceId = (seed: number, index: number): string => {
	const half = (offset: number): string =>
		((seed * (index + 1 + offset) * 2_654_435_761) >>> 0)
			.toString(16)
			.padStart(8, '0');

	return `${half(0)}${half(7)}${half(13)}${half(29)}`;
};

const traceRows = (count: number, slow: boolean): SlowTraceData['data'] =>
	Array.from({ length: count }, (_unused, index) => ({
		timestamp: timestamp(index),
		data: {
			duration_ms: String(slow ? 4_800 - index * 260 : 1_200 - index * 90),
			span_count: 18 + index * 3,
			trace_id: traceId(slow ? 0x51ad : 0xe770, index),
		},
	}));

export const funnelSlowTracesResponse = (count: number): SlowTraceData => ({
	status: 'success',
	data: traceRows(count, true),
});

export const funnelErrorTracesResponse = (count: number): ErrorTraceData => ({
	status: 'success',
	data: traceRows(count, false),
});

/** Trace ids the step validation found, which is what turns the run button green. */
export const funnelValidateResponse = (
	count: number,
): {
	status: string;
	data: Array<{ timestamp: string; data: { trace_id: string } }> | null;
} => ({
	status: 'success',
	data:
		count === 0
			? null
			: Array.from({ length: count }, (_unused, index) => ({
					timestamp: timestamp(index),
					data: { trace_id: traceId(0x7a11, index) },
				})),
});
