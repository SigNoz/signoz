/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { IFields } from 'types/api/logs/fields';
import type { PayloadProps as LogsAggregatePayload } from 'types/api/logs/getLogsAggregate';
import type { ILog } from 'types/api/logs/log';

const SERVICES = ['frontend', 'checkout', 'cart', 'payment', 'shipping'];

const SEVERITIES = [
	{ text: 'INFO', number: 9 },
	{ text: 'WARN', number: 13 },
	{ text: 'ERROR', number: 17 },
];

const MESSAGES = [
	'handled POST /api/checkout',
	'authorised payment for order',
	'cart read from redis',
	'shipping quote returned',
	'order written to postgres',
];

/** The fields panel splits what the workspace sends into pinned and the rest. */
export const logFieldsResponse = (): IFields => ({
	selected: [
		{ name: 'timestamp', type: 'string', dataType: 'string' },
		{ name: 'body', type: 'string', dataType: 'string' },
	],
	interesting: [
		{ name: 'service.name', type: 'tag', dataType: 'string' },
		{ name: 'severity_text', type: 'string', dataType: 'string' },
		{ name: 'http.status_code', type: 'tag', dataType: 'int64' },
		{ name: 'k8s.namespace.name', type: 'resource', dataType: 'string' },
	],
});

const AT = 1_766_000_000_000;

const hex = (seed: number, index: number, length: number): string =>
	((seed * (index + 1) * 2_654_435_761) >>> 0)
		.toString(16)
		.padStart(length, '0');

const logLine = (index: number): ILog => {
	const severity = SEVERITIES[index % SEVERITIES.length];
	const service = SERVICES[index % SERVICES.length];
	const timestamp = (AT - index * 1_200) * 1_000_000;

	return {
		date: new Date(AT - index * 1_200).toISOString(),
		timestamp,
		id: hex(0x109, index, 16),
		traceId: `${hex(0x71ac, index, 16)}${hex(0x71ac, index + 1, 16)}`,
		spanID: hex(0x5aa1, index, 16),
		traceFlags: 1,
		severityText: severity.text,
		severityNumber: severity.number,
		severity_text: severity.text,
		severity_number: severity.number,
		body: `${severity.text} ${service} ${MESSAGES[index % MESSAGES.length]} in ${
			8 + (index % 40)
		}ms`,
		// `ILog` types every attribute bag as `Record<string, never>`, so anything
		// with a value in it has to go through `unknown`. The app reads the values
		// all the same.
		resources_string: { 'service.name': service } as unknown as Record<
			string,
			never
		>,
		scope_string: {},
		attributesString: {},
		attributes_string: { 'service.name': service } as unknown as Record<
			string,
			never
		>,
		attributesInt: {},
		attributesFloat: {},
	};
};

export const logsResponse = (count: number, limit: number): ILog[] =>
	Array.from({ length: Math.min(count, limit) }, (_unused, index) =>
		logLine(index),
	);

/**
 * The histogram above the list, one bucket per step across the window the page
 * asked for, so it fills whichever range the time picker is on.
 */
export const logsAggregateResponse = (
	timestampStart: number,
	timestampEnd: number,
	stepInSeconds: number,
	perBucket: number,
): LogsAggregatePayload => {
	const start = Math.floor(timestampStart / 1e9);
	const end = Math.floor(timestampEnd / 1e9);
	const step = Math.max(stepInSeconds, 1);
	const buckets = Math.min(Math.max(Math.floor((end - start) / step), 0), 400);

	return Object.fromEntries(
		Array.from({ length: buckets }, (_unused, index) => {
			const timestamp = (start + index * step) * 1_000_000_000;

			return [
				String(timestamp),
				{
					timestamp,
					value: Math.round(perBucket * (0.7 + ((index * 37) % 60) / 100)),
				},
			];
		}),
	);
};
