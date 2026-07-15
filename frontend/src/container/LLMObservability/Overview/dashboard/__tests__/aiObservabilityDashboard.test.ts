import { PANEL_TYPES } from 'constants/queryBuilder';

import {
	aiObservabilityLayout,
	aiObservabilityWidgets,
} from '../aiObservabilityDashboard';

describe('aiObservabilityDashboard config', () => {
	it('defines 15 widgets with a matching layout entry each', () => {
		expect(aiObservabilityWidgets).toHaveLength(15);
		expect(aiObservabilityLayout).toHaveLength(15);

		const layoutIds = new Set(aiObservabilityLayout.map((l) => l.i));
		aiObservabilityWidgets.forEach((widget) => {
			expect(layoutIds.has(widget.id)).toBe(true);
		});
	});

	it('uses only renderable panel types', () => {
		const allowed = new Set<string>([
			PANEL_TYPES.VALUE,
			PANEL_TYPES.TIME_SERIES,
			PANEL_TYPES.TABLE,
		]);
		aiObservabilityWidgets.forEach((widget) => {
			expect(allowed.has(widget.panelTypes)).toBe(true);
		});
	});

	it('builds every query as a v5 traces builder query with expression aggregations', () => {
		aiObservabilityWidgets.forEach((widget) => {
			const { queryData } = widget.query.builder;
			expect(queryData.length).toBeGreaterThan(0);
			queryData.forEach((query) => {
				expect(query.dataSource).toBe('traces');
				expect(query.aggregations?.length).toBeGreaterThan(0);
				// v5 filter shape (expression string), not the legacy { items, op }.
				expect(query.filter).toHaveProperty('expression');
			});
		});
	});
});
