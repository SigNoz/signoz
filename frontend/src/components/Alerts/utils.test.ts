import type { SortState } from 'components/TanStackTableView/types';

import type { AlertWithLabels, FilterValue } from './types';
import { filterByLabels, searchByLabels, sortByColumn } from './utils';

interface TestAlert extends AlertWithLabels {
	name: string;
	value: number;
}

const createAlert = (
	name: string,
	value: number,
	labels?: Record<string, string>,
): TestAlert => ({
	name,
	value,
	labels,
});

describe('sortByColumn', () => {
	const alerts: TestAlert[] = [
		createAlert('Alert C', 3),
		createAlert('Alert A', 1),
		createAlert('Alert B', 2),
	];

	const getSortValue = (
		item: TestAlert,
		columnName: string,
	): string | number => {
		if (columnName === 'name') {
			return item.name;
		}
		if (columnName === 'value') {
			return item.value;
		}
		return '';
	};

	it('should return items unchanged when no orderBy provided', () => {
		const result = sortByColumn(alerts, null, getSortValue);
		expect(result).toStrictEqual(alerts);
	});

	it('should sort by string column ascending', () => {
		const orderBy: SortState = { columnName: 'name', order: 'asc' };
		const result = sortByColumn(alerts, orderBy, getSortValue);
		expect(result.map((a) => a.name)).toStrictEqual([
			'Alert A',
			'Alert B',
			'Alert C',
		]);
	});

	it('should sort by string column descending', () => {
		const orderBy: SortState = { columnName: 'name', order: 'desc' };
		const result = sortByColumn(alerts, orderBy, getSortValue);
		expect(result.map((a) => a.name)).toStrictEqual([
			'Alert C',
			'Alert B',
			'Alert A',
		]);
	});

	it('should sort by number column ascending', () => {
		const orderBy: SortState = { columnName: 'value', order: 'asc' };
		const result = sortByColumn(alerts, orderBy, getSortValue);
		expect(result.map((a) => a.value)).toStrictEqual([1, 2, 3]);
	});

	it('should sort by number column descending', () => {
		const orderBy: SortState = { columnName: 'value', order: 'desc' };
		const result = sortByColumn(alerts, orderBy, getSortValue);
		expect(result.map((a) => a.value)).toStrictEqual([3, 2, 1]);
	});

	it('should use defaultSort when orderBy is null', () => {
		const defaultSort: SortState = { columnName: 'value', order: 'asc' };
		const result = sortByColumn(alerts, null, getSortValue, defaultSort);
		expect(result.map((a) => a.value)).toStrictEqual([1, 2, 3]);
	});

	it('should not mutate original array', () => {
		const original = [...alerts];
		const orderBy: SortState = { columnName: 'name', order: 'asc' };
		sortByColumn(alerts, orderBy, getSortValue);
		expect(alerts).toStrictEqual(original);
	});

	it('should handle empty array', () => {
		const result = sortByColumn(
			[],
			{ columnName: 'name', order: 'asc' },
			getSortValue,
		);
		expect(result).toStrictEqual([]);
	});

	it('should handle equal values', () => {
		const duplicates = [
			createAlert('Same', 1),
			createAlert('Same', 1),
			createAlert('Same', 1),
		];
		const orderBy: SortState = { columnName: 'name', order: 'asc' };
		const result = sortByColumn(duplicates, orderBy, getSortValue);
		expect(result).toHaveLength(3);
	});
});

describe('searchByLabels', () => {
	const alerts: TestAlert[] = [
		createAlert('CPU High', 1, { severity: 'critical', team: 'infra' }),
		createAlert('Memory Warning', 2, { severity: 'warning', team: 'backend' }),
		createAlert('Disk Full', 3, { severity: 'error', region: 'us-east' }),
		createAlert('Network Slow', 4, {}),
		createAlert('No Labels', 5),
	];

	const getAlertName = (alert: TestAlert): string => alert.name;

	it('should return all items when search is empty', () => {
		const result = searchByLabels(alerts, '', getAlertName);
		expect(result).toStrictEqual(alerts);
	});

	it('should return all items when search is whitespace', () => {
		const result = searchByLabels(alerts, '   ', getAlertName);
		expect(result).toStrictEqual(alerts);
	});

	it('should search by alert name', () => {
		const result = searchByLabels(alerts, 'CPU', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('CPU High');
	});

	it('should search by alert name case-insensitive', () => {
		const result = searchByLabels(alerts, 'cpu', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('CPU High');
	});

	it('should search by severity label', () => {
		const result = searchByLabels(alerts, 'critical', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('CPU High');
	});

	it('should search by any label key', () => {
		const result = searchByLabels(alerts, 'team', getAlertName);
		expect(result).toHaveLength(2);
	});

	it('should search by any label value', () => {
		const result = searchByLabels(alerts, 'infra', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('CPU High');
	});

	it('should handle alerts with no labels', () => {
		const result = searchByLabels(alerts, 'No Labels', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('No Labels');
	});

	it('should handle partial matches', () => {
		const result = searchByLabels(alerts, 'warn', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Memory Warning');
	});

	it('should return empty for no matches', () => {
		const result = searchByLabels(alerts, 'nonexistent', getAlertName);
		expect(result).toStrictEqual([]);
	});

	it('should trim search text', () => {
		const result = searchByLabels(alerts, '  CPU  ', getAlertName);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('CPU High');
	});
});

describe('filterByLabels', () => {
	const alerts: TestAlert[] = [
		createAlert('A1', 1, { severity: 'critical', team: 'infra', env: 'prod' }),
		createAlert('A2', 2, { severity: 'critical', team: 'backend', env: 'prod' }),
		createAlert('A3', 3, { severity: 'warning', team: 'infra', env: 'staging' }),
		createAlert('A4', 4, { severity: 'info', team: 'frontend', env: 'dev' }),
		createAlert('A5', 5, {}),
		createAlert('A6', 6),
	];

	const createFilter = (value: string): FilterValue => ({ value });

	it('should return all items when filters are empty', () => {
		const result = filterByLabels(alerts, []);
		expect(result).toStrictEqual(alerts);
	});

	it('should return all items when filters is null-ish', () => {
		const result = filterByLabels(alerts, null as unknown as FilterValue[]);
		expect(result).toStrictEqual(alerts);
	});

	it('should filter by single label', () => {
		const filters = [createFilter('severity:critical')];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
		expect(result.map((a) => a.name)).toStrictEqual(['A1', 'A2']);
	});

	it('should use OR logic for same key', () => {
		const filters = [
			createFilter('severity:critical'),
			createFilter('severity:warning'),
		];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(3);
		expect(result.map((a) => a.name)).toStrictEqual(['A1', 'A2', 'A3']);
	});

	it('should use AND logic for different keys', () => {
		const filters = [
			createFilter('severity:critical'),
			createFilter('team:infra'),
		];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('A1');
	});

	it('should handle case-insensitive keys', () => {
		const filters = [createFilter('SEVERITY:critical')];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
	});

	it('should handle case-insensitive values', () => {
		const filters = [createFilter('severity:CRITICAL')];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
	});

	it('should trim whitespace', () => {
		const filters = [createFilter(' severity : critical ')];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
	});

	it('should return empty for invalid filter format', () => {
		const filters = [createFilter('invalid')];
		const result = filterByLabels(alerts, filters);
		expect(result).toStrictEqual([]);
	});

	it('should ignore invalid filters mixed with valid', () => {
		const filters = [createFilter('invalid'), createFilter('severity:critical')];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
	});

	it('should exclude alerts without matching label key', () => {
		const filters = [createFilter('nonexistent:value')];
		const result = filterByLabels(alerts, filters);
		expect(result).toStrictEqual([]);
	});

	it('should exclude alerts with no labels', () => {
		const filters = [createFilter('severity:critical')];
		const result = filterByLabels(alerts, filters);
		expect(result.every((a) => a.labels !== undefined)).toBe(true);
	});

	it('should handle complex AND/OR combinations', () => {
		const filters = [
			createFilter('env:prod'),
			createFilter('env:staging'),
			createFilter('team:infra'),
		];
		const result = filterByLabels(alerts, filters);
		expect(result).toHaveLength(2);
		expect(result.map((a) => a.name)).toStrictEqual(['A1', 'A3']);
	});
});
