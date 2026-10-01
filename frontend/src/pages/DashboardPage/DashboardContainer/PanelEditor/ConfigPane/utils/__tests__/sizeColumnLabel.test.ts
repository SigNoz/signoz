import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { getSizeColumnLabel } from '../sizeColumnLabel';

const scatterSpec = (size?: string): DashboardtypesPanelSpecDTO =>
	({
		plugin: { kind: 'signoz/ScatterPlotPanel', spec: { dimensions: { size } } },
		queries: [],
	}) as unknown as DashboardtypesPanelSpecDTO;

const COLUMNS = [{ key: 'B', label: 'B.count()', name: 'count()' }];

describe('getSizeColumnLabel', () => {
	it('names the bound column by its label', () => {
		expect(getSizeColumnLabel(scatterSpec('B'), COLUMNS)).toBe('B.count()');
	});

	it('is unset when nothing is bound', () => {
		expect(getSizeColumnLabel(scatterSpec(''), COLUMNS)).toBeUndefined();
		expect(getSizeColumnLabel(scatterSpec(), COLUMNS)).toBeUndefined();
	});

	it('is unset for a bound key the loaded result no longer has, as the chart draws it', () => {
		expect(getSizeColumnLabel(scatterSpec('C'), COLUMNS)).toBeUndefined();
	});

	it('falls back to the key before the result loads', () => {
		expect(getSizeColumnLabel(scatterSpec('B'), [])).toBe('B');
	});

	it('is unset for other kinds', () => {
		const spec = {
			plugin: { kind: 'signoz/TablePanel', spec: {} },
			queries: [],
		} as unknown as DashboardtypesPanelSpecDTO;
		expect(getSizeColumnLabel(spec, COLUMNS)).toBeUndefined();
	});
});
