import {
	TelemetrytypesSignalDTO,
	type DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import { defaultColumnsForSignal } from '../ListColumnsEditor/selectFields';
import { getSwitchedPluginSpec } from '../getSwitchedPluginSpec';

jest.mock('pages/DashboardPageV2/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(),
}));
jest.mock('../ListColumnsEditor/selectFields', () => ({
	defaultColumnsForSignal: jest.fn(),
}));

const mockGetPanelDefinition = getPanelDefinition as unknown as jest.Mock;
const mockDefaultColumnsForSignal =
	defaultColumnsForSignal as unknown as jest.Mock;

function specWith(pluginSpec: unknown): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'Panel' },
		plugin: { kind: 'signoz/TablePanel', spec: pluginSpec },
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

describe('getSwitchedPluginSpec', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDefaultColumnsForSignal.mockReturnValue([]);
	});

	it('carries only unit + decimalPrecision when the new kind has a formatting section', () => {
		mockGetPanelDefinition.mockReturnValue({
			sections: [{ kind: 'formatting', controls: { unit: true, decimals: true } }],
		});
		const old = specWith({
			formatting: { unit: 'ms', decimalPrecision: 2, columnUnits: { A: 'bytes' } },
			axes: { logScale: true },
		});

		const result = getSwitchedPluginSpec(
			old,
			'signoz/TimeSeriesPanel',
			TelemetrytypesSignalDTO.logs,
		);

		expect(result.formatting).toStrictEqual({ unit: 'ms', decimalPrecision: 2 });
		// Type-specific config from the old kind is dropped.
		expect((result as { axes?: unknown }).axes).toBeUndefined();
	});

	it('does not carry formatting when the new kind has no formatting section', () => {
		mockGetPanelDefinition.mockReturnValue({ sections: [{ kind: 'columns' }] });
		const old = specWith({ formatting: { unit: 'ms' } });

		const result = getSwitchedPluginSpec(
			old,
			'signoz/ListPanel',
			TelemetrytypesSignalDTO.logs,
		);

		expect(result.formatting).toBeUndefined();
	});

	it('seeds List columns from the signal when switching into a List', () => {
		const columns = [{ name: 'body' }];
		mockDefaultColumnsForSignal.mockReturnValue(columns);
		mockGetPanelDefinition.mockReturnValue({ sections: [{ kind: 'columns' }] });

		const result = getSwitchedPluginSpec(
			specWith({}),
			'signoz/ListPanel',
			TelemetrytypesSignalDTO.logs,
		);

		expect(mockDefaultColumnsForSignal).toHaveBeenCalledWith(
			TelemetrytypesSignalDTO.logs,
		);
		expect(result.selectFields).toBe(columns);
	});

	it('includes the kind section defaults (e.g. legend position)', () => {
		mockGetPanelDefinition.mockReturnValue({
			sections: [{ kind: 'legend', controls: { position: true } }],
		});

		const result = getSwitchedPluginSpec(
			specWith({}),
			'signoz/PieChartPanel',
			TelemetrytypesSignalDTO.logs,
		);

		expect(result.legend?.position).toBe('bottom');
	});
});
