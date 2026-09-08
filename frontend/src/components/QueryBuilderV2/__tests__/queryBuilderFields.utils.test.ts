import { QueryBuilderField } from '../queryBuilderFields.types';
import {
	mergeQueryBuilderFieldsConfig,
	RAW_QUERY_FIELDS,
	resolveQueryBuilderField,
	resolveQueryBuilderFields,
} from '../queryBuilderFields.utils';

const SUPPORTED = [
	QueryBuilderField.GroupBy,
	QueryBuilderField.Having,
	QueryBuilderField.OrderBy,
	QueryBuilderField.Limit,
	QueryBuilderField.Legend,
];

describe('resolveQueryBuilderField', () => {
	it('leaves an unconfigured field available', () => {
		expect(resolveQueryBuilderField(QueryBuilderField.Having)).toStrictEqual({
			hidden: false,
			disabled: false,
			pinned: false,
		});
	});

	it('hides a field configured hidden', () => {
		const resolved = resolveQueryBuilderField(QueryBuilderField.Having, {
			[QueryBuilderField.Having]: { state: 'hidden' },
		});

		expect(resolved.hidden).toBe(true);
		expect(resolved.disabled).toBe(false);
	});

	it('carries the reason through on a disabled field', () => {
		const resolved = resolveQueryBuilderField(QueryBuilderField.Having, {
			[QueryBuilderField.Having]: {
				state: 'disabled',
				reason: 'Having filters aggregated results.',
			},
		});

		expect(resolved).toStrictEqual({
			hidden: false,
			disabled: true,
			reason: 'Having filters aggregated results.',
			pinned: false,
		});
	});

	it('pins a field configured pinned', () => {
		const resolved = resolveQueryBuilderField(QueryBuilderField.OrderBy, {
			[QueryBuilderField.OrderBy]: { state: 'pinned' },
		});

		expect(resolved.pinned).toBe(true);
		expect(resolved.hidden).toBe(false);
	});

	it('only ever resolves one state at a time', () => {
		const resolved = resolveQueryBuilderField(QueryBuilderField.Limit, {
			[QueryBuilderField.Limit]: { state: 'disabled', reason: 'why' },
		});

		expect([resolved.hidden, resolved.disabled, resolved.pinned]).toStrictEqual([
			false,
			true,
			false,
		]);
	});
});

describe('resolveQueryBuilderFields', () => {
	it('resolves every supported field and nothing else', () => {
		const resolved = resolveQueryBuilderFields(SUPPORTED);

		expect([...resolved.keys()]).toStrictEqual(SUPPORTED);
	});

	it('cannot widen beyond what the builder supports', () => {
		const resolved = resolveQueryBuilderFields([QueryBuilderField.Legend], {
			[QueryBuilderField.ReduceTo]: { state: 'pinned' },
		});

		expect(resolved.has(QueryBuilderField.ReduceTo)).toBe(false);
	});
});

describe('mergeQueryBuilderFieldsConfig', () => {
	it('returns the override when there is no baseline', () => {
		const override = { [QueryBuilderField.Limit]: { state: 'hidden' } } as const;

		expect(mergeQueryBuilderFieldsConfig(undefined, override)).toBe(override);
	});

	it('returns the baseline when there is no override', () => {
		expect(mergeQueryBuilderFieldsConfig(RAW_QUERY_FIELDS, undefined)).toBe(
			RAW_QUERY_FIELDS,
		);
	});

	it('lets the override win per field, leaving the rest of the baseline intact', () => {
		const merged = mergeQueryBuilderFieldsConfig(RAW_QUERY_FIELDS, {
			[QueryBuilderField.Having]: { state: 'disabled', reason: 'no aggregation' },
		});

		expect(merged?.[QueryBuilderField.Having]).toStrictEqual({
			state: 'disabled',
			reason: 'no aggregation',
		});
		expect(merged?.[QueryBuilderField.GroupBy]).toStrictEqual({
			state: 'hidden',
		});
		expect(merged?.[QueryBuilderField.OrderBy]).toStrictEqual({
			state: 'pinned',
		});
	});
});

describe('RAW_QUERY_FIELDS', () => {
	it('reduces an aggregate surface to a pinned order by', () => {
		const resolved = resolveQueryBuilderFields(SUPPORTED, RAW_QUERY_FIELDS);

		const visible = [...resolved.entries()]
			.filter(([, field]) => !field.hidden)
			.map(([key]) => key);

		expect(visible).toStrictEqual([QueryBuilderField.OrderBy]);
		expect(resolved.get(QueryBuilderField.OrderBy)?.pinned).toBe(true);
	});

	it('leaves additional queries alone, so trace matching still allows several', () => {
		expect(
			resolveQueryBuilderField(
				QueryBuilderField.AdditionalQueries,
				RAW_QUERY_FIELDS,
			).hidden,
		).toBe(false);
	});
});
