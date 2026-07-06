import {
	NEW_PANEL_ID,
	newPanelSearch,
	parseNewPanelKind,
	parseNewPanelLayoutIndex,
} from '../newPanelRoute';

describe('newPanelRoute', () => {
	it('round-trips kind + layoutIndex through the new-panel search', () => {
		const search = newPanelSearch('signoz/ListPanel', 2);
		expect(parseNewPanelKind(NEW_PANEL_ID, search)).toBe('signoz/ListPanel');
		expect(parseNewPanelLayoutIndex(search)).toBe(2);
	});

	it('omits layoutIndex when not provided', () => {
		const search = newPanelSearch('signoz/TimeSeriesPanel');
		expect(parseNewPanelKind(NEW_PANEL_ID, search)).toBe(
			'signoz/TimeSeriesPanel',
		);
		expect(parseNewPanelLayoutIndex(search)).toBeUndefined();
	});

	it('returns null for an existing panel id (not the new sentinel)', () => {
		const search = newPanelSearch('signoz/ListPanel');
		expect(parseNewPanelKind('a1b2c3d4-uuid', search)).toBeNull();
	});

	it('returns null when the kind param is missing or unknown', () => {
		expect(parseNewPanelKind(NEW_PANEL_ID, '')).toBeNull();
		expect(
			parseNewPanelKind(NEW_PANEL_ID, '?panelKind=NotARealPanel'),
		).toBeNull();
	});
});
