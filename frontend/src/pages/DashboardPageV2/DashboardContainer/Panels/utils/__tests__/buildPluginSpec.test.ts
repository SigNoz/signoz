import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	type DashboardtypesPanelSpecDTO,
	DashboardtypesThresholdFormatDTO,
	DashboardtypesTimePreferenceDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import { defaultColumnsForSignal } from '../../../PanelEditor/ListColumnsEditor/selectFields';
import { sections as listSections } from '../../kinds/ListPanel/sections';
import { sections as timeSeriesSections } from '../../kinds/TimeSeriesPanel/sections';
import {
	SectionKind,
	ThresholdVariant,
	type SectionConfig,
} from '../../types/sections';
import { buildPluginSpec } from '../buildPluginSpec';

jest.mock('../../../PanelEditor/ListColumnsEditor/selectFields', () => ({
	defaultColumnsForSignal: jest.fn(),
}));

const mockDefaultColumnsForSignal =
	defaultColumnsForSignal as unknown as jest.Mock;

/** A panel spec carrying the plugin.spec a seed reads; the rest of the shape is irrelevant. */
function oldSpecWith(pluginSpec: unknown): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'Panel' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: pluginSpec },
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockDefaultColumnsForSignal.mockReturnValue([]);
});

describe('buildPluginSpec', () => {
	describe('folding mechanism', () => {
		it('returns an empty spec for no sections', () => {
			expect(buildPluginSpec([])).toStrictEqual({});
		});

		it('seeds nothing for sections with no seed (Axes, Buckets, ContextLinks)', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Axes, controls: { minMax: true, logScale: true } },
				{ kind: SectionKind.Buckets, controls: { count: true, width: true } },
				{ kind: SectionKind.ContextLinks },
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
		});

		it('omits the key entirely when a seed returns undefined (never key: undefined)', () => {
			const result = buildPluginSpec([
				{ kind: SectionKind.Legend, controls: { colors: true } },
			]);

			expect(result).toStrictEqual({});
			expect(result).not.toHaveProperty('legend');
		});

		it('composes defaults and carried config from several sections in one pass', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Visualization,
					controls: { switchPanelKind: true, timePreference: true },
				},
				{ kind: SectionKind.Legend, controls: { position: true } },
				{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
			];
			const oldSpec = oldSpecWith({
				formatting: { unit: 'ms', decimalPrecision: 2 },
			});

			expect(buildPluginSpec(sections, { oldSpec })).toStrictEqual({
				visualization: {
					timePreference: DashboardtypesTimePreferenceDTO.global_time,
				},
				legend: { position: DashboardtypesLegendPositionDTO.bottom },
				formatting: { unit: 'ms', decimalPrecision: 2 },
			});
		});
	});

	describe('visualization / legend seeds', () => {
		it('seeds visualization global_time and legend bottom when those controls are on', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Visualization,
					controls: { switchPanelKind: true, timePreference: true },
				},
				{ kind: SectionKind.Legend, controls: { position: true } },
			];
			expect(buildPluginSpec(sections)).toStrictEqual({
				visualization: {
					timePreference: DashboardtypesTimePreferenceDTO.global_time,
				},
				legend: { position: DashboardtypesLegendPositionDTO.bottom },
			});
		});

		it('seeds neither when their defaulting controls are absent', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Visualization, controls: { switchPanelKind: true } },
				{ kind: SectionKind.Legend, controls: { colors: true } },
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
		});
	});

	describe('chartAppearance seed', () => {
		it('seeds only the declared defaulting controls', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.ChartAppearance,
					controls: { lineStyle: true, fillMode: true },
				},
			];
			expect(buildPluginSpec(sections).chartAppearance).toStrictEqual({
				lineStyle: DashboardtypesLineStyleDTO.solid,
				fillMode: DashboardtypesFillModeDTO.none,
			});
		});

		it('seeds nothing when only non-defaulting controls are declared (showPoints/spanGaps)', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.ChartAppearance,
					controls: { showPoints: true, spanGaps: true },
				},
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
		});
	});

	describe('formatting seed (carry, gated by controls)', () => {
		it('carries unit + decimalPrecision when the kind declares both', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
			];
			const oldSpec = oldSpecWith({
				formatting: { unit: 'ms', decimalPrecision: 3 },
			});

			expect(buildPluginSpec(sections, { oldSpec }).formatting).toStrictEqual({
				unit: 'ms',
				decimalPrecision: 3,
			});
		});

		it('drops unit when the target kind does not declare it (TimeSeries → Table)', () => {
			// Table formatting has columnUnits + decimals only; carrying unit breaks the save.
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Formatting,
					controls: { decimals: true, columnUnits: true },
				},
			];
			const oldSpec = oldSpecWith({
				formatting: { unit: 'ms', decimalPrecision: 2 },
			});

			expect(buildPluginSpec(sections, { oldSpec }).formatting).toStrictEqual({
				decimalPrecision: 2,
			});
		});

		it('carries a decimalPrecision of 0 (falsy but defined) and omits missing fields', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
			];
			const oldSpec = oldSpecWith({ formatting: { decimalPrecision: 0 } });

			expect(buildPluginSpec(sections, { oldSpec }).formatting).toStrictEqual({
				decimalPrecision: 0,
			});
		});

		it('seeds no formatting on a new panel or when nothing supported is present', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Formatting,
					controls: { decimals: true, columnUnits: true },
				},
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
			expect(
				buildPluginSpec(sections, {
					oldSpec: oldSpecWith({ formatting: { unit: 'ms' } }),
				}),
			).toStrictEqual({});
		});
	});

	describe('columns seed', () => {
		it('seeds the signal default columns when a Columns section is present', () => {
			const columns = [{ name: 'timestamp' }, { name: 'body' }];
			mockDefaultColumnsForSignal.mockReturnValue(columns);

			const result = buildPluginSpec([{ kind: SectionKind.Columns }], {
				signal: TelemetrytypesSignalDTO.traces,
			});

			expect(mockDefaultColumnsForSignal).toHaveBeenCalledWith(
				TelemetrytypesSignalDTO.traces,
			);
			expect(result.selectFields).toBe(columns);
		});

		it('seeds nothing (and skips the lookup) when no signal is in context', () => {
			const result = buildPluginSpec([{ kind: SectionKind.Columns }]);

			expect(mockDefaultColumnsForSignal).not.toHaveBeenCalled();
			expect(result).toStrictEqual({});
		});
	});

	describe('thresholds seed (variant remap)', () => {
		function switchThresholds(
			variant: ThresholdVariant | undefined,
			thresholds: unknown[],
		): unknown {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Thresholds, controls: { variant } },
			];
			return buildPluginSpec(sections, { oldSpec: oldSpecWith({ thresholds }) })
				.thresholds;
		}

		it('keeps color/value/unit/label within the label variant (and defaults to label)', () => {
			expect(
				switchThresholds(undefined, [
					{ value: 80, color: '#F1575F', unit: 'ms', label: 'warn' },
				]),
			).toStrictEqual([
				{ value: 80, color: '#F1575F', unit: 'ms', label: 'warn' },
			]);
		});

		it('remaps label → comparison, seeding operator + format and dropping label', () => {
			expect(
				switchThresholds(ThresholdVariant.COMPARISON, [
					{ value: 80, color: '#F1575F', label: 'warn' },
				]),
			).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.above,
					format: DashboardtypesThresholdFormatDTO.text,
				},
			]);
		});

		it('preserves existing operator/format when remapping comparison → table', () => {
			expect(
				switchThresholds(ThresholdVariant.TABLE, [
					{
						value: 80,
						color: '#F1575F',
						operator: DashboardtypesComparisonOperatorDTO.below,
						format: DashboardtypesThresholdFormatDTO.text,
					},
				]),
			).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.below,
					format: DashboardtypesThresholdFormatDTO.text,
					columnName: '',
				},
			]);
		});

		it('drops table-only operator/format/columnName when remapping table → label', () => {
			expect(
				switchThresholds(ThresholdVariant.LABEL, [
					{
						value: 0,
						color: '#F1575F',
						operator: DashboardtypesComparisonOperatorDTO.above,
						format: DashboardtypesThresholdFormatDTO.background,
						columnName: 'p99',
					},
				]),
			).toStrictEqual([{ value: 0, color: '#F1575F' }]);
		});

		it('seeds nothing for an empty or absent threshold list', () => {
			expect(switchThresholds(ThresholdVariant.LABEL, [])).toBeUndefined();
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Thresholds,
					controls: { variant: ThresholdVariant.LABEL },
				},
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
		});
	});

	// Integration against real kind configs — guards against a section-config regression.
	describe('per-kind defaults (real sections, no context)', () => {
		it('seeds the full TimeSeries default set', () => {
			expect(buildPluginSpec(timeSeriesSections)).toStrictEqual({
				visualization: {
					timePreference: DashboardtypesTimePreferenceDTO.global_time,
				},
				legend: { position: DashboardtypesLegendPositionDTO.bottom },
				chartAppearance: {
					lineStyle: DashboardtypesLineStyleDTO.solid,
					lineInterpolation: DashboardtypesLineInterpolationDTO.spline,
					fillMode: DashboardtypesFillModeDTO.none,
				},
			});
		});

		it('returns an empty spec for List (only switchPanelKind, nothing to seed)', () => {
			expect(buildPluginSpec(listSections)).toStrictEqual({});
		});
	});
});
