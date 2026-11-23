import { TelemetrytypesFieldContextDTO as FieldContext } from 'api/generated/services/sigNoz.schemas';

import {
	toDistributionFieldOptions,
	toDistributionFieldText,
} from '../distributionFieldOptions';

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

describe('toDistributionFieldText', () => {
	it.each([
		[key('duration_nano', FieldContext.span), 'duration_nano'],
		[key('severity_number', FieldContext.log), 'severity_number'],
		[
			key('http.status_code', FieldContext.attribute),
			'attribute.http.status_code',
		],
		[key('latency', FieldContext.body), 'body.latency'],
	])('%j → %s', (fieldKey, text) => {
		expect(toDistributionFieldText(fieldKey)).toBe(text);
	});
});

const item = (
	text: string,
): { type: 'item'; label: string; value: string } => ({
	type: 'item',
	label: text,
	value: text,
});

describe('toDistributionFieldOptions', () => {
	it('groups columns first, keeps contexts apart, drops trace keys and repeats', () => {
		expect(toDistributionFieldOptions(KEYS, 'duration_nano')).toStrictEqual([
			{
				type: 'group',
				label: 'Columns',
				value: 'column',
				items: [item('duration_nano')],
			},
			{
				type: 'group',
				label: 'Attribute',
				value: 'attribute',
				items: [item('attribute.quantity')],
			},
			{
				type: 'group',
				label: 'Resource',
				value: 'resource',
				items: [item('resource.quantity')],
			},
			{
				type: 'group',
				label: 'Body',
				value: 'body',
				items: [item('body.latency')],
			},
		]);
	});

	it('leads with a saved field the keys do not carry', () => {
		const options = toDistributionFieldOptions(KEYS, 'queue-depth');
		expect(options[0]).toStrictEqual(item('queue-depth'));
		expect(options).toHaveLength(5);
	});

	it('adds nothing for an empty or listed field', () => {
		expect(toDistributionFieldOptions(KEYS, '')).toHaveLength(4);
		expect(toDistributionFieldOptions(KEYS, 'body.latency')).toHaveLength(4);
	});
});
