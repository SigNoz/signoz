import { logEventMock } from '__tests__/logEventMock';
import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import type { SortState } from 'components/TanStackTableView/types';

import type { AlertRule } from '../types';
import {
	ALERT_ACTIONS,
	alertActionLogEvent,
	filterRulesByFilters,
	getAlertSortValue,
	sortRules,
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

describe('getAlertSortValue', () => {
	it('returns state for "state"', () => {
		expect(
			getAlertSortValue(
				makeRule({ state: RuletypesAlertStateDTO.firing }),
				'state',
			),
		).toBe('firing');
	});

	it('returns alert name for "name"', () => {
		expect(getAlertSortValue(makeRule({ alert: 'My Rule' }), 'name')).toBe(
			'My Rule',
		);
	});

	it('returns severity label for "severity"', () => {
		expect(
			getAlertSortValue(
				makeRule({ labels: { severity: 'critical' } }),
				'severity',
			),
		).toBe('critical');
	});

	it('returns createdAt as ms', () => {
		const rule = makeRule({ createdAt: '2023-10-15T10:00:00Z' });
		const result = getAlertSortValue(rule, 'createdAt');
		expect(result).toBe(new Date('2023-10-15T10:00:00Z').getTime());
	});

	it('returns updatedAt as ms', () => {
		const rule = makeRule({ updatedAt: '2023-10-19T10:00:00Z' });
		const result = getAlertSortValue(rule, 'updatedAt');
		expect(result).toBe(new Date('2023-10-19T10:00:00Z').getTime());
	});

	it('returns 0 when createdAt missing', () => {
		expect(
			getAlertSortValue(makeRule({ createdAt: undefined }), 'createdAt'),
		).toBe(0);
	});

	it('returns empty for unknown column', () => {
		expect(getAlertSortValue(baseRule, 'xxx')).toBe('');
	});

	it('returns empty for missing fields', () => {
		expect(
			getAlertSortValue(
				makeRule({ state: undefined, labels: undefined }),
				'state',
			),
		).toBe('');
		expect(
			getAlertSortValue(
				makeRule({ state: undefined, labels: undefined }),
				'severity',
			),
		).toBe('');
	});
});

describe('sortRules', () => {
	const r1 = makeRule({ id: '1', alert: 'A' });
	const r2 = makeRule({ id: '2', alert: 'B' });
	const r3 = makeRule({ id: '3', alert: 'C' });

	it('sorts ascending by name', () => {
		const order: SortState = { columnName: 'name', order: 'asc' };
		const result = sortRules([r3, r1, r2], order);
		expect(result.map((r) => r.alert)).toStrictEqual(['A', 'B', 'C']);
	});

	it('sorts descending by name', () => {
		const order: SortState = { columnName: 'name', order: 'desc' };
		const result = sortRules([r1, r2, r3], order);
		expect(result.map((r) => r.alert)).toStrictEqual(['C', 'B', 'A']);
	});

	it('returns unsorted when orderBy is null', () => {
		const result = sortRules([r3, r1, r2], null);
		expect(result.map((r) => r.alert)).toStrictEqual(['C', 'A', 'B']);
	});
});

describe('filterRulesByFilters', () => {
	const r1 = makeRule({
		id: '1',
		alert: 'R1',
		state: RuletypesAlertStateDTO.firing,
		labels: { severity: 'critical' },
	});
	const r2 = makeRule({
		id: '2',
		alert: 'R2',
		state: RuletypesAlertStateDTO.inactive,
		labels: { severity: 'warning' },
	});
	const r3 = makeRule({
		id: '3',
		alert: 'R3',
		state: RuletypesAlertStateDTO.firing,
		labels: { severity: 'warning' },
	});
	const rules = [r1, r2, r3];

	it('returns input when filters empty', () => {
		expect(filterRulesByFilters(rules, [])).toStrictEqual(rules);
	});

	it('filters by state', () => {
		const result = filterRulesByFilters(rules, ['state:firing']);
		expect(result.map((r) => r.id)).toStrictEqual(['1', '3']);
	});

	it('filters by severity', () => {
		const result = filterRulesByFilters(rules, ['severity:warning']);
		expect(result.map((r) => r.id)).toStrictEqual(['2', '3']);
	});

	it('combines state AND severity', () => {
		const result = filterRulesByFilters(rules, [
			'state:firing',
			'severity:warning',
		]);
		expect(result.map((r) => r.id)).toStrictEqual(['3']);
	});

	it('OR within same key (state)', () => {
		const result = filterRulesByFilters(rules, [
			'state:firing',
			'state:inactive',
		]);
		expect(result.map((r) => r.id)).toStrictEqual(['1', '2', '3']);
	});

	it('matches values case-insensitively', () => {
		const result = filterRulesByFilters(rules, ['state:FIRING']);
		expect(result.map((r) => r.id)).toStrictEqual(['1', '3']);
	});

	it('ignores prefixes with wrong case (state: is required lowercase)', () => {
		const result = filterRulesByFilters(rules, ['STATE:FIRING']);
		expect(result).toStrictEqual(rules);
	});

	it('returns empty when no rule matches', () => {
		expect(filterRulesByFilters(rules, ['state:nonexistent'])).toStrictEqual([]);
	});

	it('ignores unknown prefix', () => {
		expect(filterRulesByFilters(rules, ['foo:bar'])).toStrictEqual(rules);
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
