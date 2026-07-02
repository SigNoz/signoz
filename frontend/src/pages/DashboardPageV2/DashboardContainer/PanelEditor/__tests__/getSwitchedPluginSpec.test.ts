import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesThresholdFormatDTO,
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

	describe('thresholds', () => {
		it('does not carry thresholds when the new kind has no thresholds section', () => {
			mockGetPanelDefinition.mockReturnValue({ sections: [{ kind: 'columns' }] });
			const old = specWith({
				thresholds: [{ value: 80, color: '#F1575F', label: 'warn' }],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/ListPanel',
				TelemetrytypesSignalDTO.logs,
			);

			expect(result.thresholds).toBeUndefined();
		});

		it('carries thresholds verbatim within the label variant (color/value/unit/label)', () => {
			mockGetPanelDefinition.mockReturnValue({
				sections: [{ kind: 'thresholds', controls: { variant: 'label' } }],
			});
			const old = specWith({
				thresholds: [{ value: 80, color: '#F1575F', unit: 'ms', label: 'warn' }],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/BarChartPanel',
				TelemetrytypesSignalDTO.logs,
			);

			expect(result.thresholds).toStrictEqual([
				{ value: 80, color: '#F1575F', unit: 'ms', label: 'warn' },
			]);
		});

		it('remaps label thresholds into the comparison variant, defaulting operator + format', () => {
			mockGetPanelDefinition.mockReturnValue({
				sections: [{ kind: 'thresholds', controls: { variant: 'comparison' } }],
			});
			const old = specWith({
				thresholds: [{ value: 80, color: '#F1575F', label: 'warn' }],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/NumberPanel',
				TelemetrytypesSignalDTO.logs,
			);

			// The label is dropped; operator/format are seeded so the threshold can match.
			expect(result.thresholds).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.above,
					format: DashboardtypesThresholdFormatDTO.text,
				},
			]);
		});

		it('remaps comparison thresholds into the table variant, keeping operator/format and seeding a column', () => {
			mockGetPanelDefinition.mockReturnValue({
				sections: [{ kind: 'thresholds', controls: { variant: 'table' } }],
			});
			const old = specWith({
				thresholds: [
					{
						value: 80,
						color: '#F1575F',
						operator: DashboardtypesComparisonOperatorDTO.below,
						format: DashboardtypesThresholdFormatDTO.text,
					},
				],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/TablePanel',
				TelemetrytypesSignalDTO.logs,
			);

			expect(result.thresholds).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.below,
					format: DashboardtypesThresholdFormatDTO.text,
					columnName: '',
				},
			]);
		});

		it('drops the table-only columnName when remapping into the label variant', () => {
			mockGetPanelDefinition.mockReturnValue({
				sections: [{ kind: 'thresholds', controls: { variant: 'label' } }],
			});
			const old = specWith({
				thresholds: [
					{
						value: 80,
						color: '#F1575F',
						operator: DashboardtypesComparisonOperatorDTO.above,
						format: DashboardtypesThresholdFormatDTO.background,
						columnName: 'p99',
					},
				],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/TimeSeriesPanel',
				TelemetrytypesSignalDTO.logs,
			);

			expect(result.thresholds).toStrictEqual([{ value: 80, color: '#F1575F' }]);
		});

		it('defaults the variant to label when the thresholds section omits controls', () => {
			mockGetPanelDefinition.mockReturnValue({
				sections: [{ kind: 'thresholds', controls: {} }],
			});
			const old = specWith({
				thresholds: [{ value: 80, color: '#F1575F', label: 'warn' }],
			});

			const result = getSwitchedPluginSpec(
				old,
				'signoz/TimeSeriesPanel',
				TelemetrytypesSignalDTO.logs,
			);

			expect(result.thresholds).toStrictEqual([
				{ value: 80, color: '#F1575F', label: 'warn' },
			]);
		});
	});
});
