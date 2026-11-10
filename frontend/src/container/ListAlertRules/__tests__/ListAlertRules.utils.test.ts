import { logEventMock } from '__tests__/logEventMock';
import {
	RuletypesListOrderDTO,
	RuletypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SortState } from 'components/TanStackTableView/types';

import type { AlertRule, RuleListFilter } from '../types';
import {
	ALERT_ACTIONS,
	alertActionLogEvent,
	DEFAULT_RULE_LIST_FILTER,
	isDefaultRuleListFilter,
	isSameRuleListFilter,
	toListSort,
	toOrderBy,
} from '../utils';

const baseRule = {
	id: 'r1',
	alert: 'Rule 1',
	alertType: 'METRIC_BASED_ALERT',
	state: 'inactive',
	labels: { severity: 'info' },
	condition: {},
	createdAt: '2023-10-15T10:00:00Z',
	updatedAt: '2023-10-19T10:00:00Z',
} as unknown as AlertRule;

const makeRule = (overrides: Partial<AlertRule>): AlertRule => ({
	...baseRule,
	...overrides,
});

describe('toListSort', () => {
	it('returns the default sort when orderBy is null', () => {
		expect(toListSort(null)).toStrictEqual({
			sort: RuletypesListSortDTO.updated_at,
			order: RuletypesListOrderDTO.desc,
		});
	});

	it('returns the default sort for an unknown column', () => {
		expect(toListSort({ columnName: 'labels', order: 'asc' })).toStrictEqual({
			sort: RuletypesListSortDTO.updated_at,
			order: RuletypesListOrderDTO.desc,
		});
	});

	it.each([
		['state', RuletypesListSortDTO.state],
		['name', RuletypesListSortDTO.name],
		['severity', RuletypesListSortDTO.severity],
		['createdAt', RuletypesListSortDTO.created_at],
		['updatedAt', RuletypesListSortDTO.updated_at],
	])('maps column "%s" to sort "%s"', (columnName, sort) => {
		expect(toListSort({ columnName, order: 'asc' })).toStrictEqual({
			sort,
			order: RuletypesListOrderDTO.asc,
		});
	});

	it('maps desc order', () => {
		expect(toListSort({ columnName: 'name', order: 'desc' })).toStrictEqual({
			sort: RuletypesListSortDTO.name,
			order: RuletypesListOrderDTO.desc,
		});
	});
});

describe('toOrderBy', () => {
	it('returns null for the default sort', () => {
		expect(
			toOrderBy(RuletypesListSortDTO.updated_at, RuletypesListOrderDTO.desc),
		).toBeNull();
	});

	it('returns the column for a non-default sort', () => {
		expect(
			toOrderBy(RuletypesListSortDTO.created_at, RuletypesListOrderDTO.asc),
		).toStrictEqual<SortState>({ columnName: 'createdAt', order: 'asc' });
		expect(
			toOrderBy(RuletypesListSortDTO.updated_at, RuletypesListOrderDTO.asc),
		).toStrictEqual<SortState>({ columnName: 'updatedAt', order: 'asc' });
	});

	it('round-trips with toListSort', () => {
		const orderBy: SortState = { columnName: 'severity', order: 'desc' };
		const { sort, order } = toListSort(orderBy);
		expect(toOrderBy(sort, order)).toStrictEqual(orderBy);
	});
});

describe('isSameRuleListFilter', () => {
	const filter: RuleListFilter = {
		query: "severity = 'critical'",
		states: ['firing', 'pending'],
		sort: RuletypesListSortDTO.name,
		order: RuletypesListOrderDTO.asc,
	};

	it('ignores surrounding whitespace in the query', () => {
		expect(
			isSameRuleListFilter(filter, { ...filter, query: `  ${filter.query} ` }),
		).toBe(true);
	});

	it('ignores states order', () => {
		expect(
			isSameRuleListFilter(filter, { ...filter, states: ['pending', 'firing'] }),
		).toBe(true);
	});

	it.each<[string, Partial<RuleListFilter>]>([
		['query', { query: "severity = 'warning'" }],
		['states', { states: ['firing'] }],
		['sort', { sort: RuletypesListSortDTO.state }],
		['order', { order: RuletypesListOrderDTO.desc }],
	])('detects a different %s', (_, change) => {
		expect(isSameRuleListFilter(filter, { ...filter, ...change })).toBe(false);
	});
});

describe('isDefaultRuleListFilter', () => {
	it('is true for DEFAULT_RULE_LIST_FILTER', () => {
		expect(isDefaultRuleListFilter(DEFAULT_RULE_LIST_FILTER)).toBe(true);
	});

	it('is true for a whitespace-only query', () => {
		expect(
			isDefaultRuleListFilter({ ...DEFAULT_RULE_LIST_FILTER, query: '  ' }),
		).toBe(true);
	});

	it('is false once any field differs', () => {
		expect(
			isDefaultRuleListFilter({ ...DEFAULT_RULE_LIST_FILTER, states: ['firing'] }),
		).toBe(false);
		expect(
			isDefaultRuleListFilter({
				...DEFAULT_RULE_LIST_FILTER,
				sort: RuletypesListSortDTO.name,
			}),
		).toBe(false);
	});
});

describe('alertActionLogEvent', () => {
	it('logs with mapped action label', () => {
		const rule = makeRule({
			id: 'rule-1',
			alert: 'My Rule',
			alertType: 'METRIC_BASED_ALERT' as AlertRule['alertType'],
		});
		alertActionLogEvent(ALERT_ACTIONS.EDIT, rule);
		expect(logEventMock).toHaveBeenCalledWith('Alert: Action', {
			ruleId: 'rule-1',
			dataSource: expect.any(String),
			name: 'My Rule',
			action: 'Edit',
		});
	});

	it('falls back to raw action when unmapped', () => {
		alertActionLogEvent('custom', baseRule);
		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'custom' }),
		);
	});

	it('maps TOGGLE action', () => {
		alertActionLogEvent(ALERT_ACTIONS.TOGGLE, baseRule);
		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Enable/Disable' }),
		);
	});

	it('maps DELETE and CLONE', () => {
		alertActionLogEvent(ALERT_ACTIONS.DELETE, baseRule);
		alertActionLogEvent(ALERT_ACTIONS.CLONE, baseRule);
		expect(logEventMock).toHaveBeenNthCalledWith(
			1,
			'Alert: Action',
			expect.objectContaining({ action: 'Delete' }),
		);
		expect(logEventMock).toHaveBeenNthCalledWith(
			2,
			'Alert: Action',
			expect.objectContaining({ action: 'Clone' }),
		);
	});
});
