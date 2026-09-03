import {
	convertFiltersToExpression,
	convertFiltersToExpressionWithExistingQuery,
} from 'components/QueryBuilderV2/utils';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import {
	Query,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import {
	applyCheckboxToggle,
	clearFilterFromQuery,
	deriveCheckboxState,
	getNotInOperator,
} from './checkboxFilterQuery';
import { CheckedState } from '../../types';
import { SectionType } from './v2/itemRules';

const KEY = 'service.name';

/**
 * Mini test framework
 * -------------------
 * `filters.items` is the source of truth the checkbox algebra mutates.
 * `filter.expression` is the derived value the backend actually reads, and it is
 * authoritatively rebuilt from the items on every URL round trip
 * (`useGetCompositeQueryParam` -> `convertFiltersToExpressionWithExistingQuery`).
 * That rebuild is additive, so `applyCheckboxToggle` re-derives its own clauses
 * into the expression itself: otherwise the round trip resurrects a clause the
 * toggle removed, or appends a duplicate of one it replaced.
 *
 * So a case does not assert the intermediate expression the toggle emits. It
 * asserts the pair that has to stay consistent:
 *   - `items`      : exact structured clauses after the toggle
 *   - `expression` : the expression AFTER the round trip, which is what ships
 *
 * `runToggle` runs the real reducer, then feeds its output through the real
 * converter to get the shipped expression.
 */

type SimpleItem = {
	key: string;
	op: string;
	value: TagFilterItem['value'];
};

function toTagItem(item: SimpleItem, idx: number): TagFilterItem {
	return {
		id: `id-${idx}`,
		key: { key: item.key, type: 'tag' } as TagFilterItem['key'],
		op: item.op,
		value: item.value,
	};
}

// Serialises items into an expression (via the app's own converter) so a case's
// starting state is self-consistent (items and expression agree), the way it
// would be in the app after a prior round trip.
const serializeItems = (items: SimpleItem[]): string =>
	convertFiltersToExpression({ items: items.map(toTagItem), op: 'AND' })
		.expression;

function buildQuery(items: SimpleItem[], expression: string): Query {
	return {
		builder: {
			queryData: [
				{
					filters: { items: items.map(toTagItem), op: 'AND' },
					filter: { expression },
				},
			],
		},
	} as unknown as Query;
}

// Simulates the URL round trip: rebuild the shipped expression from the items,
// reconciled against whatever expression the toggle left behind. Trimmed to
// absorb a converter quirk that leaves a trailing space when it widens an
// operator in place (e.g. `=` -> `IN`).
function roundTripExpression(
	items: TagFilterItem[],
	emittedExpression: string,
): string {
	const filters: TagFilter = { items, op: 'AND' };
	const { filter } = convertFiltersToExpressionWithExistingQuery(
		filters,
		emittedExpression,
	);
	return (filter?.expression ?? '').trim();
}

interface ToggleAction {
	value: string;
	checked: boolean;
	isOnlyOrAllClicked?: boolean;
	previousState?: CheckedState;
	sectionType?: SectionType;
	source?: QuickFiltersSource;
	attributeValues?: string[];
}

interface ToggleCase {
	name: string;
	initial?: { items?: SimpleItem[]; expression?: string };
	action: ToggleAction;
	expected: { items: SimpleItem[]; expression: string };
}

function runToggle(c: ToggleCase): { items: SimpleItem[]; expression: string } {
	const initialItems = c.initial?.items ?? [];
	const initialExpression =
		c.initial?.expression ?? serializeItems(initialItems);

	const result = applyCheckboxToggle({
		currentQuery: buildQuery(initialItems, initialExpression),
		activeQueryIndex: 0,
		filter: { attributeKey: { key: KEY, type: 'tag' } } as never,
		source: c.action.source ?? QuickFiltersSource.LOGS_EXPLORER,
		attributeValues: c.action.attributeValues ?? ['a', 'b', 'c'],
		value: c.action.value,
		checked: c.action.checked,
		isOnlyOrAllClicked: c.action.isOnlyOrAllClicked ?? false,
		previousState: c.action.previousState,
		sectionType: c.action.sectionType,
	});

	const active = result.builder.queryData[0];
	const items = active?.filters?.items ?? [];
	return {
		items: items.map((item) => ({
			key: item.key?.key ?? '',
			op: item.op,
			value: item.value,
		})),
		expression: roundTripExpression(items, active?.filter?.expression ?? ''),
	};
}

// Flat list. Every row asserts both the structured items and the shipped
// (round-tripped) expression, which must stay in sync.
const TOGGLE_CASES: ToggleCase[] = [
	{
		name: 'no clause, checked -> IN',
		action: { value: 'a', checked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: 'a' }],
			expression: `service.name in ['a']`,
		},
	},
	{
		name: 'no clause, unchecked -> NOT IN',
		action: { value: 'a', checked: false },
		expected: {
			items: [{ key: KEY, op: 'not in', value: 'a' }],
			expression: `service.name not in ['a']`,
		},
	},
	{
		name: 'no clause, unchecked on infra -> not in',
		action: {
			value: 'a',
			checked: false,
			source: QuickFiltersSource.INFRA_MONITORING,
		},
		// `nin` is what the source asks for, but re-deriving the expression
		// normalises it. Nothing observes the difference: both infra pages send
		// `filter.expression` and never `filters.items`.
		expected: {
			items: [{ key: KEY, op: 'not in', value: 'a' }],
			expression: `service.name not in ['a']`,
		},
	},
	{
		name: 'IN, check another value -> appended',
		initial: { items: [{ key: KEY, op: 'in', value: ['a'] }] },
		action: { value: 'b', checked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: ['a', 'b'] }],
			expression: `service.name in ['a', 'b']`,
		},
	},
	{
		name: 'IN, check when value is scalar -> promoted to array',
		initial: { items: [{ key: KEY, op: 'in', value: 'a' }] },
		action: { value: 'b', checked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: ['a', 'b'] }],
			expression: `service.name in ['a', 'b']`,
		},
	},
	{
		name: 'IN, uncheck one of many -> filtered out',
		initial: { items: [{ key: KEY, op: 'in', value: ['a', 'b'] }] },
		action: { value: 'a', checked: false },
		expected: {
			items: [{ key: KEY, op: 'in', value: ['b'] }],
			expression: `service.name in ['b']`,
		},
	},
	{
		name: 'IN, uncheck last value in array -> clause gone',
		initial: { items: [{ key: KEY, op: 'in', value: ['a'] }] },
		action: { value: 'a', checked: false },
		expected: { items: [], expression: '' },
	},
	{
		name: 'IN, uncheck scalar value -> clause gone',
		initial: { items: [{ key: KEY, op: 'in', value: 'a' }] },
		action: { value: 'a', checked: false },
		expected: { items: [], expression: '' },
	},
	{
		name: 'IN, uncheck in RELATED section -> replaced by NOT IN for that value',
		initial: { items: [{ key: KEY, op: 'in', value: ['a', 'b'] }] },
		action: { value: 'a', checked: false, sectionType: SectionType.RELATED },
		expected: {
			items: [{ key: KEY, op: 'not in', value: 'a' }],
			expression: `service.name not in ['a']`,
		},
	},
	{
		name: 'NOT IN, was unchecked then checked -> replaced by IN for that value',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a'] }] },
		action: { value: 'b', checked: true, previousState: 'unchecked' },
		expected: {
			items: [{ key: KEY, op: 'in', value: 'b' }],
			expression: `service.name in ['b']`,
		},
	},
	{
		name: 'NOT IN, re-checking an excluded value clears it, not flips it to IN',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a'] }] },
		action: { value: 'a', checked: true, previousState: 'unchecked' },
		expected: { items: [], expression: '' },
	},
	{
		name: 'NOT IN, re-checking one of several excluded values keeps the rest',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }] },
		action: { value: 'a', checked: true, previousState: 'unchecked' },
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['b'] }],
			expression: `service.name not in ['b']`,
		},
	},
	{
		name: 'NOT IN, exclude another value -> appended',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a'] }] },
		action: { value: 'b', checked: false },
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }],
			expression: `service.name not in ['a', 'b']`,
		},
	},
	{
		name: 'NOT IN, exclude when scalar -> promoted to array',
		initial: { items: [{ key: KEY, op: 'not in', value: 'a' }] },
		action: { value: 'b', checked: false },
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }],
			expression: `service.name not in ['a', 'b']`,
		},
	},
	{
		name: 'NOT IN, check an excluded value -> removed from array',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }] },
		action: { value: 'a', checked: true },
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['b'] }],
			expression: `service.name not in ['b']`,
		},
	},
	{
		name: 'NOT IN, check last excluded value in array -> clause gone',
		initial: { items: [{ key: KEY, op: 'not in', value: ['a'] }] },
		action: { value: 'a', checked: true },
		expected: { items: [], expression: '' },
	},
	{
		name: 'NOT IN, check excluded scalar value -> clause gone',
		initial: { items: [{ key: KEY, op: 'not in', value: 'a' }] },
		action: { value: 'a', checked: true },
		expected: { items: [], expression: '' },
	},
	{
		name: '= check another value -> promoted to IN array',
		initial: { items: [{ key: KEY, op: '=', value: 'a' }] },
		action: { value: 'b', checked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: ['a', 'b'] }],
			expression: `service.name in ['a', 'b']`,
		},
	},
	{
		name: '= uncheck -> clause gone',
		initial: { items: [{ key: KEY, op: '=', value: 'a' }] },
		action: { value: 'a', checked: false },
		expected: { items: [], expression: '' },
	},
	{
		name: '!= exclude another value -> promoted to NOT IN array',
		initial: { items: [{ key: KEY, op: '!=', value: 'a' }] },
		action: { value: 'b', checked: false },
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }],
			expression: `service.name not in ['a', 'b']`,
		},
	},
	{
		name: '!= exclude another value on infra -> not in array',
		initial: { items: [{ key: KEY, op: '!=', value: 'a' }] },
		action: {
			value: 'b',
			checked: false,
			source: QuickFiltersSource.INFRA_MONITORING,
		},
		expected: {
			items: [{ key: KEY, op: 'not in', value: ['a', 'b'] }],
			expression: `service.name not in ['a', 'b']`,
		},
	},
	{
		name: '!= check -> clause gone',
		initial: { items: [{ key: KEY, op: '!=', value: 'a' }] },
		action: { value: 'a', checked: true },
		expected: { items: [], expression: '' },
	},
	{
		name: 'Only with no clause -> IN scalar',
		action: { value: 'a', checked: true, isOnlyOrAllClicked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: 'a' }],
			expression: `service.name in ['a']`,
		},
	},
	{
		name: 'Only replaces a multi-value IN with a single value',
		initial: { items: [{ key: KEY, op: 'in', value: ['a', 'b'] }] },
		action: { value: 'a', checked: true, isOnlyOrAllClicked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: 'a' }],
			expression: `service.name in ['a']`,
		},
	},
	{
		name: 'All (clicking the sole selected value) -> clause gone',
		initial: { items: [{ key: KEY, op: 'in', value: ['a'] }] },
		action: { value: 'a', checked: true, isOnlyOrAllClicked: true },
		expected: { items: [], expression: '' },
	},
	{
		name: 'dropping the last clause keeps other keys in the expression',
		initial: {
			items: [{ key: KEY, op: 'in', value: 'a' }],
			expression: `${KEY} = 'a' AND http.method = 'GET'`,
		},
		action: { value: 'a', checked: false },
		// The seeded items omit the http.method clause the expression carries;
		// re-deriving reconciles it back, which is why items is not empty here.
		expected: {
			items: [{ key: 'http.method', op: '=', value: 'GET' }],
			expression: `http.method = 'GET'`,
		},
	},
	{
		name: 'dropping the last clause strips the prefixed spelling too',
		initial: {
			items: [{ key: 'resource.service.name', op: 'in', value: 'a' }],
			expression: `resource.service.name = 'a'`,
		},
		action: { value: 'a', checked: false },
		expected: { items: [], expression: '' },
	},
	{
		name: 'removing the value must keep a free-form clause on the same key',
		initial: {
			items: [{ key: KEY, op: '=', value: 'a' }],
			expression: `${KEY} = 'a' AND ${KEY} CONTAINS 'keepme'`,
		},
		action: { value: 'a', checked: false },
		expected: {
			items: [{ key: KEY, op: 'contains', value: 'keepme' }],
			expression: `service.name CONTAINS 'keepme'`,
		},
	},
	{
		name: 'a second clause on the same key must not survive an add',
		initial: {
			items: [{ key: KEY, op: 'in', value: ['a'] }],
			expression: `${KEY} IN ['a'] AND ${KEY} != 'z'`,
		},
		action: { value: 'b', checked: true },
		expected: {
			items: [{ key: KEY, op: 'in', value: ['a', 'b'] }],
			expression: `service.name in ['a', 'b']`,
		},
	},
];

describe('applyCheckboxToggle (items + shipped expression stay in sync)', () => {
	it.each(TOGGLE_CASES)('$name', (c) => {
		const got = runToggle(c);
		expect(got.items).toStrictEqual(c.expected.items);
		expect(got.expression).toBe(c.expected.expression);
	});
});

describe('getNotInOperator', () => {
	it('returns short "nin" for infra monitoring', () => {
		expect(getNotInOperator(QuickFiltersSource.INFRA_MONITORING)).toBe('nin');
	});

	it('returns long "not in" for other sources', () => {
		expect(getNotInOperator(QuickFiltersSource.LOGS_EXPLORER)).toBe('not in');
		expect(getNotInOperator(QuickFiltersSource.TRACES_EXPLORER)).toBe('not in');
	});
});

describe('deriveCheckboxState', () => {
	const attributeValues = ['a', 'b', 'c'];

	const state = (items: TagFilterItem[] | undefined): Record<string, boolean> =>
		deriveCheckboxState({ attributeValues, filterItems: items, filterKey: KEY });

	it('no clause for key -> everything checked', () => {
		expect(state([])).toStrictEqual({ a: true, b: true, c: true });
		expect(state(undefined)).toStrictEqual({ a: true, b: true, c: true });
	});

	it('unrelated clause only -> everything checked', () => {
		expect(
			state([toTagItem({ key: 'other', op: 'in', value: ['a'] }, 0)]),
		).toStrictEqual({ a: true, b: true, c: true });
	});

	it('IN [list] -> only listed values checked', () => {
		expect(
			state([toTagItem({ key: KEY, op: 'in', value: ['a', 'c'] }, 0)]),
		).toStrictEqual({ a: true, b: false, c: true });
	});

	it('= "value" -> only that value checked', () => {
		expect(
			state([toTagItem({ key: KEY, op: '=', value: 'b' }, 0)]),
		).toStrictEqual({ a: false, b: true, c: false });
	});

	it('NOT IN [list] -> everything except excluded checked', () => {
		expect(
			state([toTagItem({ key: KEY, op: 'not in', value: ['a'] }, 0)]),
		).toStrictEqual({ a: false, b: true, c: true });
	});

	it('!= "value" -> everything except that value checked', () => {
		expect(
			state([toTagItem({ key: KEY, op: '!=', value: 'b' }, 0)]),
		).toStrictEqual({ a: true, b: false, c: true });
	});

	it('matches by base key across context prefixes', () => {
		expect(
			state([
				toTagItem({ key: 'resource.service.name', op: 'in', value: ['a'] }, 0),
			]),
		).toStrictEqual({ a: true, b: false, c: false });
	});

	it('coerces boolean / number values to string keys', () => {
		expect(
			deriveCheckboxState({
				attributeValues: ['true', '42'],
				filterItems: [toTagItem({ key: KEY, op: '=', value: true }, 0)],
				filterKey: KEY,
			}),
		).toStrictEqual({ true: true, '42': false });
	});
});

describe('clearFilterFromQuery', () => {
	it('removes the key from items and expression at the active index only', () => {
		const query = {
			builder: {
				queryData: [
					{
						filters: {
							items: [
								toTagItem({ key: KEY, op: 'in', value: ['a'] }, 0),
								toTagItem({ key: 'http.method', op: '=', value: 'GET' }, 1),
							],
							op: 'AND',
						},
						filter: { expression: `${KEY} = 'a' AND http.method = 'GET'` },
					},
					{
						filters: {
							items: [toTagItem({ key: KEY, op: 'in', value: ['a'] }, 2)],
							op: 'AND',
						},
						filter: { expression: `${KEY} = 'a'` },
					},
				],
			},
		} as unknown as Query;

		const result = clearFilterFromQuery({
			currentQuery: query,
			filter: { attributeKey: { key: KEY, type: 'tag' } } as never,
			activeQueryIndex: 0,
		});

		const active = result.builder.queryData[0];
		expect(active.filters?.items).toStrictEqual([
			expect.objectContaining({
				key: expect.objectContaining({ key: 'http.method' }),
			}),
		]);
		expect(active.filter?.expression).toBe(`http.method = 'GET'`);

		// Other queries keep both halves: stripping their expression while leaving
		// their items alone only churned a clause the round trip put straight back.
		const other = result.builder.queryData[1];
		expect(other.filters?.items).toHaveLength(1);
		expect(other.filter?.expression).toBe(`${KEY} = 'a'`);
	});
});
