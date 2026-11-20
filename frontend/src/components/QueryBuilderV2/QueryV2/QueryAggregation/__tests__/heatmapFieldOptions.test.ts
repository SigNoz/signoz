import { TelemetrytypesFieldContextDTO as FieldContext } from 'api/generated/services/sigNoz.schemas';

import {
	toHeatmapFieldOptions,
	toHeatmapFieldText,
} from '../heatmapFieldOptions';

const key = (
	name: string,
	fieldContext: FieldContext,
): { name: string; fieldContext: FieldContext } => ({ name, fieldContext });

const KEYS = [
	key('quantity', FieldContext.resource),
	key('duration_nano', FieldContext.span),
	key('quantity', FieldContext.attribute),
	key('total_tokens', FieldContext.trace),
	key('latency', FieldContext.body),
	key('duration_nano', FieldContext.span),
];

describe('toHeatmapFieldText', () => {
	it.each([
		[key('duration_nano', FieldContext.span), 'duration_nano'],
		[key('severity_number', FieldContext.log), 'severity_number'],
		[
			key('http.status_code', FieldContext.attribute),
			'attribute.http.status_code',
		],
		[key('latency', FieldContext.body), 'body.latency'],
	])('%j → %s', (fieldKey, text) => {
		expect(toHeatmapFieldText(fieldKey)).toBe(text);
	});
});

describe('toHeatmapFieldOptions', () => {
	it('groups columns first, keeps contexts apart, drops trace keys and repeats', () => {
		expect(toHeatmapFieldOptions(KEYS, 'duration_nano')).toStrictEqual([
			{
				label: 'Columns',
				options: [{ label: 'duration_nano', value: 'duration_nano' }],
			},
			{
				label: 'Attribute',
				options: [{ label: 'attribute.quantity', value: 'attribute.quantity' }],
			},
			{
				label: 'Resource',
				options: [{ label: 'resource.quantity', value: 'resource.quantity' }],
			},
			{
				label: 'Body',
				options: [{ label: 'body.latency', value: 'body.latency' }],
			},
		]);
	});

	it('leads with a saved field the keys do not carry', () => {
		const options = toHeatmapFieldOptions(KEYS, 'queue-depth');
		expect(options[0]).toStrictEqual({
			label: 'queue-depth',
			value: 'queue-depth',
		});
		expect(options).toHaveLength(5);
	});

	it('adds nothing for an empty or listed field', () => {
		expect(toHeatmapFieldOptions(KEYS, '')).toHaveLength(4);
		expect(toHeatmapFieldOptions(KEYS, 'body.latency')).toHaveLength(4);
	});
});
