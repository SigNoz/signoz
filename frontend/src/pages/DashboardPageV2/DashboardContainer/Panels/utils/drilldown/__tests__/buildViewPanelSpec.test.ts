import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getSwitchedPluginSpec } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/getSwitchedPluginSpec';
import { PANEL_TYPE_TO_PANEL_KIND } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { toPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { buildViewPanelSpec } from '../buildViewPanelSpec';

// The query conversion + kind-switch spec builder are tested in their own suites; here we
// isolate buildViewPanelSpec's branching (same kind vs. kind switch).
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({ toPerses: jest.fn(() => [{ kind: 'mock-query' }]) }),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelEditor/getSwitchedPluginSpec',
	() => ({ getSwitchedPluginSpec: jest.fn(() => ({ switched: true })) }),
);

const query = {} as Query;

function specOfKind(kind: string): DashboardtypesPanelSpecDTO {
	return {
		plugin: { kind, spec: { formatting: {} } },
		queries: [],
		display: { name: 'panel' },
	} as unknown as DashboardtypesPanelSpecDTO;
}

describe('PANEL_TYPE_TO_PANEL_KIND', () => {
	it('is the inverse of the kind→type map', () => {
		expect(PANEL_TYPE_TO_PANEL_KIND[PANEL_TYPES.VALUE]).toBe(
			'signoz/NumberPanel',
		);
		expect(PANEL_TYPE_TO_PANEL_KIND[PANEL_TYPES.TABLE]).toBe('signoz/TablePanel');
		expect(PANEL_TYPE_TO_PANEL_KIND[PANEL_TYPES.TIME_SERIES]).toBe(
			'signoz/TimeSeriesPanel',
		);
	});
});

describe('buildViewPanelSpec', () => {
	beforeEach(() => jest.clearAllMocks());

	it('keeps the kind and only swaps the queries when the target type matches', () => {
		const spec = specOfKind('signoz/TimeSeriesPanel');
		const result = buildViewPanelSpec({
			spec,
			query,
			panelType: PANEL_TYPES.TIME_SERIES,
		});

		expect(result.plugin.kind).toBe('signoz/TimeSeriesPanel');
		expect(result.plugin.spec).toBe(spec.plugin.spec);
		expect(result.queries).toStrictEqual([{ kind: 'mock-query' }]);
		expect(toPerses).toHaveBeenCalledWith(query, PANEL_TYPES.TIME_SERIES);
		expect(getSwitchedPluginSpec).not.toHaveBeenCalled();
	});

	it('switches the kind (Value → Table) and rebuilds the plugin spec', () => {
		const result = buildViewPanelSpec({
			spec: specOfKind('signoz/NumberPanel'),
			query,
			panelType: PANEL_TYPES.TABLE,
		});

		expect(result.plugin.kind).toBe('signoz/TablePanel');
		expect(result.plugin.spec).toStrictEqual({ switched: true });
		expect(getSwitchedPluginSpec).toHaveBeenCalled();
		expect(toPerses).toHaveBeenCalledWith(query, PANEL_TYPES.TABLE);
	});
});
