import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	panelTypeVsThreshold,
	panelTypeVsSoftMinMax,
	panelTypeVsDragAndDrop,
	panelTypeVsFillSpan,
	panelTypeVsLogScale,
	panelTypeVsYAxisUnit,
	panelTypeVsCreateAlert,
	panelTypeVsBucketConfig,
	panelTypeVsPanelTimePreferences,
	panelTypeVsColumnUnitPreferences,
	panelTypeVsStackingChartPreferences,
	panelTypeVsLegendPosition,
	panelTypeVsLegendColors,
	panelTypeVsContextLinks,
	panelTypeVsDecimalPrecision,
	panelTypeVsLineInterpolation,
	panelTypeVsLineStyle,
	panelTypeVsFillMode,
	panelTypeVsShowPoints,
	panelTypeVsSpanGaps,
} from 'container/NewWidget/RightContainer/constants';
import { PanelTypeVsPanelWrapper } from 'container/PanelWrapper/constants';
import { AVAILABLE_EXPORT_PANEL_TYPES } from 'constants/panelTypes';

describe('State Timeline Panel Registration', () => {
	describe('PANEL_TYPES enum', () => {
		it('should include STATE_TIMELINE with value "state_timeline"', () => {
			expect(PANEL_TYPES.STATE_TIMELINE).toBe('state_timeline');
		});
	});

	describe('RightContainer constants maps', () => {
		it('should have threshold enabled (true)', () => {
			expect(panelTypeVsThreshold[PANEL_TYPES.STATE_TIMELINE]).toBe(true);
		});

		it('should have softMinMax disabled (false)', () => {
			expect(panelTypeVsSoftMinMax[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have dragAndDrop disabled (false)', () => {
			expect(panelTypeVsDragAndDrop[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have fillSpan enabled (true)', () => {
			expect(panelTypeVsFillSpan[PANEL_TYPES.STATE_TIMELINE]).toBe(true);
		});

		it('should have logScale disabled (false)', () => {
			expect(panelTypeVsLogScale[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have yAxisUnit disabled (false)', () => {
			expect(panelTypeVsYAxisUnit[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have createAlert enabled (true)', () => {
			expect(panelTypeVsCreateAlert[PANEL_TYPES.STATE_TIMELINE]).toBe(true);
		});

		it('should have bucketConfig disabled (false)', () => {
			expect(panelTypeVsBucketConfig[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have panelTimePreferences enabled (true)', () => {
			expect(panelTypeVsPanelTimePreferences[PANEL_TYPES.STATE_TIMELINE]).toBe(
				true,
			);
		});

		it('should have columnUnitPreferences disabled (false)', () => {
			expect(panelTypeVsColumnUnitPreferences[PANEL_TYPES.STATE_TIMELINE]).toBe(
				false,
			);
		});

		it('should have stackingChartPreferences disabled (false)', () => {
			expect(
				panelTypeVsStackingChartPreferences[PANEL_TYPES.STATE_TIMELINE],
			).toBe(false);
		});

		it('should have legendPosition enabled (true)', () => {
			expect(panelTypeVsLegendPosition[PANEL_TYPES.STATE_TIMELINE]).toBe(true);
		});

		it('should have legendColors disabled (false)', () => {
			expect(panelTypeVsLegendColors[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have contextLinks enabled (true)', () => {
			expect(panelTypeVsContextLinks[PANEL_TYPES.STATE_TIMELINE]).toBe(true);
		});

		it('should have decimalPrecision disabled (false)', () => {
			expect(panelTypeVsDecimalPrecision[PANEL_TYPES.STATE_TIMELINE]).toBe(
				false,
			);
		});

		it('should have lineInterpolation disabled (false)', () => {
			expect(panelTypeVsLineInterpolation[PANEL_TYPES.STATE_TIMELINE]).toBe(
				false,
			);
		});

		it('should have lineStyle disabled (false)', () => {
			expect(panelTypeVsLineStyle[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have fillMode disabled (false)', () => {
			expect(panelTypeVsFillMode[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have showPoints disabled (false)', () => {
			expect(panelTypeVsShowPoints[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});

		it('should have spanGaps disabled (false)', () => {
			expect(panelTypeVsSpanGaps[PANEL_TYPES.STATE_TIMELINE]).toBe(false);
		});
	});

	describe('PanelTypeVsPanelWrapper', () => {
		it('should include STATE_TIMELINE entry', () => {
			expect(PANEL_TYPES.STATE_TIMELINE in PanelTypeVsPanelWrapper).toBe(true);
		});

		it('should map STATE_TIMELINE to a defined component', () => {
			expect(
				PanelTypeVsPanelWrapper[PANEL_TYPES.STATE_TIMELINE],
			).toBeDefined();
		});
	});

	describe('AVAILABLE_EXPORT_PANEL_TYPES', () => {
		it('should NOT include STATE_TIMELINE', () => {
			expect(AVAILABLE_EXPORT_PANEL_TYPES).not.toContain(
				PANEL_TYPES.STATE_TIMELINE,
			);
		});
	});
});
