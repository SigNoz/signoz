import { SectionKind, ThresholdVariant } from '../../types/sections';
import { getSectionControls } from '../getSectionControls';

describe('getSectionControls', () => {
	it('returns the controls a kind declares for a section', () => {
		expect(
			getSectionControls('signoz/TimeSeriesPanel', SectionKind.Formatting),
		).toStrictEqual({ unit: true, decimals: true });
	});

	it('distinguishes kinds that key units per column from kinds with a panel unit', () => {
		expect(
			getSectionControls('signoz/TablePanel', SectionKind.Formatting)?.unit,
		).toBeUndefined();
		expect(
			getSectionControls('signoz/TablePanel', SectionKind.Formatting)?.columnUnits,
		).toBe(true);
	});

	it('reports the threshold variant each kind edits', () => {
		expect(
			getSectionControls('signoz/NumberPanel', SectionKind.Thresholds)?.variant,
		).toBe(ThresholdVariant.COMPARISON);
		expect(
			getSectionControls('signoz/BarChartPanel', SectionKind.Thresholds)?.variant,
		).toBe(ThresholdVariant.LABEL);
	});

	it('returns undefined when the kind does not expose the section', () => {
		expect(
			getSectionControls('signoz/ListPanel', SectionKind.Formatting),
		).toBeUndefined();
		expect(
			getSectionControls('signoz/HistogramPanel', SectionKind.Thresholds),
		).toBeUndefined();
	});

	it('returns undefined for an unregistered kind', () => {
		expect(
			getSectionControls(
				'signoz/FuturePanel' as Parameters<typeof getSectionControls>[0],
				SectionKind.Formatting,
			),
		).toBeUndefined();
	});
});
