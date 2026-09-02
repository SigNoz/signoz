import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import {
	FiltersType,
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { applyCheckboxToggle } from './checkboxFilterQuery';
import { CheckedState } from '../../types';
import { SectionType } from './v2/itemRules';

const ATTRIBUTE_KEY = 'k8s.cluster.name';

const filter = {
	type: FiltersType.CHECKBOX,
	title: 'Cluster',
	attributeKey: {
		key: ATTRIBUTE_KEY,
		dataType: 'string',
		type: 'tag',
		isColumn: false,
	},
	dataSource: DataSource.METRICS,
	defaultOpen: true,
} as unknown as IQuickFiltersConfig;

function makeQuery(expression: string, items: TagFilterItem[]): Query {
	return {
		builder: {
			queryData: [{ filter: { expression }, filters: { items, op: 'AND' } }],
		},
	} as unknown as Query;
}

/**
 * Quick filters dispatch through the URL, and `useGetCompositeQueryParam` merges
 * `filters.items` into `filter.expression` on the way back in — a clause left in
 * the expression resurrects a filter the user just removed. Every assertion here
 * runs through that round-trip.
 */
function roundTrip(query: Query): Query {
	const queryData = query.builder.queryData[0];
	const converted = convertFiltersToExpressionWithExistingQuery(
		queryData.filters || { items: [], op: 'AND' },
		queryData.filter?.expression || '',
	);
	return makeQuery(converted.filter.expression, converted.filters.items);
}

function toggle(
	query: Query,
	{
		value,
		checked,
		previousState,
		sectionType,
		isOnlyOrAllClicked = false,
		attributeValues = ['A', 'B', 'C'],
	}: {
		value: string;
		checked: boolean;
		previousState?: CheckedState;
		sectionType?: SectionType;
		isOnlyOrAllClicked?: boolean;
		attributeValues?: string[];
	},
): Query {
	return roundTrip(
		applyCheckboxToggle({
			currentQuery: query,
			activeQueryIndex: 0,
			filter,
			source: QuickFiltersSource.INFRA_MONITORING,
			attributeValues,
			value,
			checked,
			isOnlyOrAllClicked,
			previousState,
			sectionType,
		}),
	);
}

const expressionOf = (query: Query): string =>
	query.builder.queryData[0].filter?.expression ?? '';

const itemsOf = (query: Query): TagFilterItem[] =>
	query.builder.queryData[0].filters?.items ?? [];

describe('applyCheckboxToggle expression sync', () => {
	it('unchecking a value excludes it, re-checking it clears the filter', () => {
		let query = makeQuery('', []);

		query = toggle(query, {
			value: 'A',
			checked: false,
			previousState: 'checked',
			sectionType: SectionType.SELECTED,
		});
		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} not in ['A']`);

		query = toggle(query, {
			value: 'A',
			checked: true,
			previousState: 'unchecked',
			sectionType: SectionType.SELECTED,
		});
		expect(expressionOf(query)).toBe('');
		expect(itemsOf(query)).toHaveLength(0);
	});

	it('toggling the same value repeatedly stays a two-state cycle', () => {
		let query = makeQuery('', []);

		for (let i = 0; i < 3; i += 1) {
			query = toggle(query, {
				value: 'A',
				checked: false,
				previousState: 'checked',
				sectionType: SectionType.SELECTED,
			});
			expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} not in ['A']`);

			query = toggle(query, {
				value: 'A',
				checked: true,
				previousState: 'unchecked',
				sectionType: SectionType.SELECTED,
			});
			expect(expressionOf(query)).toBe('');
		}
	});

	it('re-including one of several excluded values leaves the rest excluded', () => {
		let query = makeQuery(`${ATTRIBUTE_KEY} not in ['A', 'B']`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'A',
			checked: true,
			previousState: 'unchecked',
			sectionType: SectionType.SELECTED,
		});

		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} not in ['B']`);
	});

	it('unchecking the last selected value clears the filter', () => {
		let query = makeQuery(`${ATTRIBUTE_KEY} in ['A']`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'A',
			checked: false,
			previousState: 'checked',
			sectionType: SectionType.SELECTED,
		});

		expect(expressionOf(query)).toBe('');
		expect(itemsOf(query)).toHaveLength(0);
	});

	it('unchecking one of several selected values keeps the others', () => {
		let query = makeQuery(`${ATTRIBUTE_KEY} in ['A', 'B']`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'A',
			checked: false,
			previousState: 'checked',
			sectionType: SectionType.SELECTED,
		});

		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} in ['B']`);
	});

	it('checking a value that is not excluded narrows the filter to it', () => {
		let query = makeQuery(`${ATTRIBUTE_KEY} not in ['A']`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'C',
			checked: true,
			previousState: 'unchecked',
			sectionType: SectionType.ALL_VALUES,
		});

		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} in ['C']`);
	});

	it('excluding a related value replaces the selection with a NOT IN clause', () => {
		let query = makeQuery(`${ATTRIBUTE_KEY} in ['A']`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'B',
			checked: false,
			previousState: 'checked',
			sectionType: SectionType.RELATED,
		});

		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} not in ['B']`);
	});

	it('Only narrows to the clicked value and All clears the filter', () => {
		let query = makeQuery('', []);

		query = toggle(query, {
			value: 'A',
			checked: true,
			isOnlyOrAllClicked: true,
		});
		expect(expressionOf(query)).toBe(`${ATTRIBUTE_KEY} in ['A']`);

		query = toggle(query, {
			value: 'A',
			checked: true,
			isOnlyOrAllClicked: true,
		});
		expect(expressionOf(query)).toBe('');
	});

	it('leaves clauses for other keys untouched', () => {
		let query = makeQuery(`k8s.namespace.name = 'default'`, []);
		query = roundTrip(query);

		query = toggle(query, {
			value: 'A',
			checked: false,
			previousState: 'checked',
			sectionType: SectionType.SELECTED,
		});
		expect(expressionOf(query)).toContain(`k8s.namespace.name = 'default'`);
		// consecutive clauses with no AND/OR are an implicit AND in the filter grammar
		expect(expressionOf(query)).toMatch(
			new RegExp(`${ATTRIBUTE_KEY} not in \\['A'\\]`, 'i'),
		);

		query = toggle(query, {
			value: 'A',
			checked: true,
			previousState: 'unchecked',
			sectionType: SectionType.SELECTED,
		});
		expect(expressionOf(query)).toBe(`k8s.namespace.name = 'default'`);
	});
});
