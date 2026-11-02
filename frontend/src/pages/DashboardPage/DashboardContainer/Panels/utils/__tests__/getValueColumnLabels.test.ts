import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getValueColumnLabels } from '../getValueColumnLabels';

const column = (
	id: string,
	name: string,
	queryName: string,
	isValueColumn = true,
): PanelTableColumn => ({ id, name, queryName, isValueColumn });

describe('getValueColumnLabels', () => {
	it('prefixes only the value columns whose names collide', () => {
		expect(
			getValueColumnLabels([
				column('service.name', 'service.name', '', false),
				column('A.count()', 'count()', 'A'),
				column('A.p99(duration_nano)', 'p99(duration_nano)', 'A'),
				column('B', 'count()', 'B'),
			]),
		).toStrictEqual({
			'A.count()': 'A.count()',
			'A.p99(duration_nano)': 'p99(duration_nano)',
			B: 'B.count()',
		});
	});

	it('leaves a name that already is the query name bare', () => {
		expect(
			getValueColumnLabels([column('F1', 'F1', 'F1'), column('A', 'A', 'A')]),
		).toStrictEqual({ F1: 'F1', A: 'A' });
	});

	it('leaves an alias or legend bare', () => {
		expect(
			getValueColumnLabels([
				column('A.count()', 'requests', 'A'),
				column('F1', 'Error rate', 'F1'),
			]),
		).toStrictEqual({ 'A.count()': 'requests', F1: 'Error rate' });
	});

	it('leaves a column with no query name bare', () => {
		expect(getValueColumnLabels([column('x', 'x', '')])).toStrictEqual({
			x: 'x',
		});
	});
});
