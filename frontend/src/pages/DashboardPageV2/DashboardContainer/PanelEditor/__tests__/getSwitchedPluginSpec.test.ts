import {
	type DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
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

// Thin wrapper — only prove delegation; seeding rules are covered in buildPluginSpec.test.ts.
describe('getSwitchedPluginSpec', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDefaultColumnsForSignal.mockReturnValue([]);
	});

	it("resolves the target kind's sections and carries the old spec through them", () => {
		mockGetPanelDefinition.mockReturnValue({
			sections: [
				{ kind: 'legend', controls: { position: true } },
				{ kind: 'formatting', controls: { unit: true, decimals: true } },
			],
		});
		const old = specWith({ formatting: { unit: 'ms', decimalPrecision: 2 } });

		const result = getSwitchedPluginSpec(
			old,
			'signoz/TimeSeriesPanel',
			TelemetrytypesSignalDTO.logs,
		);

		expect(mockGetPanelDefinition).toHaveBeenCalledWith('signoz/TimeSeriesPanel');
		expect(result.legend?.position).toBe('bottom');
		expect(result.formatting).toStrictEqual({ unit: 'ms', decimalPrecision: 2 });
	});

	it('forwards the signal to seed List columns', () => {
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
});
