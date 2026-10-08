import type { BuilderQuery } from 'types/api/v5/queryRange';

import { findGroupByMismatch, formatGroupByMismatch } from '../groupByMismatch';

const query = (
	name: string,
	labels: string[],
	disabled = false,
): BuilderQuery =>
	({
		name,
		disabled,
		groupBy: labels.map((label) => ({ name: label })),
	}) as BuilderQuery;

describe('findGroupByMismatch', () => {
	it('is null when every query groups by the same labels, in any order', () => {
		expect(
			findGroupByMismatch([
				query('A', ['service.name', 'host.name']),
				query('B', ['host.name', 'service.name']),
			]),
		).toBeNull();
	});

	it('is null for a single query', () => {
		expect(findGroupByMismatch([query('A', ['service.name'])])).toBeNull();
	});

	it("lists each query's labels when they differ", () => {
		expect(
			findGroupByMismatch([
				query('A', ['service.name']),
				query('B', ['host.name']),
			]),
		).toStrictEqual([
			{ queryName: 'A', labels: ['service.name'] },
			{ queryName: 'B', labels: ['host.name'] },
		]);
	});

	it('ignores disabled queries', () => {
		expect(
			findGroupByMismatch([
				query('A', ['service.name']),
				query('B', ['host.name'], true),
			]),
		).toBeNull();
	});
});

describe('formatGroupByMismatch', () => {
	it('names each query and its labels', () => {
		expect(
			formatGroupByMismatch([
				{ queryName: 'A', labels: ['service.name', 'host.name'] },
				{ queryName: 'B', labels: [] },
			]),
		).toBe('A by service.name, host.name · B ungrouped');
	});
});
