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
function oldSpecWith(
	pluginSpec: unknown,
	queries: unknown[] = [],
): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'Panel' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: pluginSpec },
		queries,
	} as unknown as DashboardtypesPanelSpecDTO;
}

function builderQueryNamed(name: string): unknown {
	return {
		spec: {
			plugin: {
				kind: 'signoz/BuilderQuery',
				spec: { name, aggregations: [{ expression: 'count()' }] },
			},
		},
	};
}

function compositeQueryWith(envelopes: unknown[]): unknown {
	return {
		spec: {
			plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
		},
	};
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

		it('seeds nothing for sections with no seed (Buckets, ContextLinks)', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Buckets, controls: { count: true, width: true } },
				{ kind: SectionKind.ContextLinks },
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
		});

		it('omits the key entirely when a seed produces an empty slice (never key: undefined)', () => {
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

		it('carries old timePreference / stacking / fillSpans the target declares', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Visualization,
					controls: {
						switchPanelKind: true,
						timePreference: true,
						stacking: true,
						fillSpans: true,
					},
				},
			];
			const oldSpec = oldSpecWith({
				visualization: {
					timePreference: DashboardtypesTimePreferenceDTO.last_6_hr,
					stackedBarChart: true,
					fillSpans: true,
				},
			});

			expect(buildPluginSpec(sections, { oldSpec }).visualization).toStrictEqual({
				timePreference: DashboardtypesTimePreferenceDTO.last_6_hr,
				stackedBarChart: true,
				fillSpans: true,
			});
		});

		it('drops visualization fields the target does not declare (Bar → TimeSeries)', () => {
			// TimeSeries has no stacking control, so Bar's stackedBarChart must not carry.
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Visualization,
					controls: { switchPanelKind: true, timePreference: true, fillSpans: true },
				},
			];
			const oldSpec = oldSpecWith({
				visualization: { stackedBarChart: true },
			});

			expect(buildPluginSpec(sections, { oldSpec }).visualization).toStrictEqual({
				timePreference: DashboardtypesTimePreferenceDTO.global_time,
			});
		});

		it('carries old legend position but never customColors', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Legend, controls: { position: true, colors: true } },
			];
			const oldSpec = oldSpecWith({
				legend: {
					position: DashboardtypesLegendPositionDTO.right,
					customColors: { 'series-a': '#F1575F' },
				},
			});

			expect(buildPluginSpec(sections, { oldSpec }).legend).toStrictEqual({
				position: DashboardtypesLegendPositionDTO.right,
			});
		});
	});

	describe('axes seed (carry, gated by controls)', () => {
		it('carries softMin/softMax/isLogScale when the kind declares both controls', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Axes, controls: { minMax: true, logScale: true } },
			];
			const oldSpec = oldSpecWith({
				axes: { softMin: 0, softMax: 100, isLogScale: true },
			});

			expect(buildPluginSpec(sections, { oldSpec }).axes).toStrictEqual({
				softMin: 0,
				softMax: 100,
				isLogScale: true,
			});
		});

		it('carries only the fields the target controls declare', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Axes, controls: { logScale: true } },
			];
			const oldSpec = oldSpecWith({
				axes: { softMin: 0, softMax: 100, isLogScale: true },
			});

			expect(buildPluginSpec(sections, { oldSpec }).axes).toStrictEqual({
				isLogScale: true,
			});
		});

		it('skips null soft bounds and seeds nothing on a new panel or empty axes', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Axes, controls: { minMax: true, logScale: true } },
			];
			expect(buildPluginSpec(sections)).toStrictEqual({});
			expect(
				buildPluginSpec(sections, {
					oldSpec: oldSpecWith({ axes: { softMin: null, softMax: null } }),
				}),
			).toStrictEqual({});
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

		it('carries old values over the defaults, gated by the declared controls', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.ChartAppearance,
					controls: { lineStyle: true, lineInterpolation: true, showPoints: true },
				},
			];
			const oldSpec = oldSpecWith({
				chartAppearance: {
					lineStyle: DashboardtypesLineStyleDTO.dashed,
					fillMode: DashboardtypesFillModeDTO.gradient,
					showPoints: false,
				},
			});

			expect(buildPluginSpec(sections, { oldSpec }).chartAppearance).toStrictEqual(
				{
					lineStyle: DashboardtypesLineStyleDTO.dashed,
					lineInterpolation: DashboardtypesLineInterpolationDTO.spline,
					showPoints: false,
				},
			);
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

		it('drops the panel-wide unit when no column keys are derivable (TimeSeries → Table, no queries)', () => {
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

		it('fans the panel-wide unit out to every value column (TimeSeries → Table)', () => {
			const sections: SectionConfig[] = [
				{
					kind: SectionKind.Formatting,
					controls: { decimals: true, columnUnits: true },
				},
			];
			const oldSpec = oldSpecWith(
				{ formatting: { unit: 'ms', decimalPrecision: 2 } },
				[
					compositeQueryWith([
						{
							type: 'builder_query',
							spec: {
								name: 'A',
								aggregations: [{ expression: 'count()' }, { expression: 'sum(bytes)' }],
							},
						},
						{
							type: 'builder_query',
							spec: { name: 'B', aggregations: [{ expression: 'count()' }] },
						},
					]),
				],
			);

			expect(buildPluginSpec(sections, { oldSpec }).formatting).toStrictEqual({
				decimalPrecision: 2,
				columnUnits: {
					'A.count()': 'ms',
					'A.sum(bytes)': 'ms',
					B: 'ms',
				},
			});
		});

		it('never seeds a panel-wide unit from per-column units (Table → TimeSeries)', () => {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Formatting, controls: { unit: true, decimals: true } },
			];
			const oldSpec = oldSpecWith(
				{ formatting: { columnUnits: { A: 'ms', B: 'ns' }, decimalPrecision: 2 } },
				[builderQueryNamed('A')],
			);

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
			queries: unknown[] = [],
		): unknown {
			const sections: SectionConfig[] = [
				{ kind: SectionKind.Thresholds, controls: { variant } },
			];
			return buildPluginSpec(sections, {
				oldSpec: oldSpecWith({ thresholds }, queries),
			}).thresholds;
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

		it('preserves operator/format and keys onto the first query column when remapping comparison → table', () => {
			expect(
				switchThresholds(
					ThresholdVariant.TABLE,
					[
						{
							value: 80,
							color: '#F1575F',
							operator: DashboardtypesComparisonOperatorDTO.below,
							format: DashboardtypesThresholdFormatDTO.text,
						},
					],
					[builderQueryNamed('A')],
				),
			).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.below,
					format: DashboardtypesThresholdFormatDTO.text,
					columnName: 'A',
				},
			]);
		});

		it('keeps an existing columnName instead of the derived default', () => {
			expect(
				switchThresholds(
					ThresholdVariant.TABLE,
					[{ value: 80, color: '#F1575F', columnName: 'p99' }],
					[builderQueryNamed('A')],
				),
			).toStrictEqual([
				{
					value: 80,
					color: '#F1575F',
					operator: DashboardtypesComparisonOperatorDTO.above,
					format: DashboardtypesThresholdFormatDTO.background,
					columnName: 'p99',
				},
			]);
		});

		it('drops table thresholds when no column can be derived (empty columnName fails the save)', () => {
			expect(
				switchThresholds(ThresholdVariant.TABLE, [{ value: 80, color: '#F1575F' }]),
			).toBeUndefined();
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
