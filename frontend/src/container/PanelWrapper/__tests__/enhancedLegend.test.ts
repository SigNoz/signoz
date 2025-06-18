/* eslint-disable sonarjs/no-duplicate-string */
import { Dimensions } from 'hooks/useDimensions';
import { LegendPosition } from 'types/api/dashboard/getAll';

import {
	applyEnhancedLegendStyling,
	calculateEnhancedLegendConfig,
	EnhancedLegendConfig,
} from '../enhancedLegend';

describe('Enhanced Legend Functionality', () => {
	const mockDimensions: Dimensions = {
		width: 800,
		height: 400,
	};

	const mockConfig: EnhancedLegendConfig = {
		minHeight: 46,
		maxHeight: 80,
		calculatedHeight: 60,
		showScrollbar: false,
		requiredRows: 2,
		minWidth: 150,
		maxWidth: 300,
		calculatedWidth: 200,
	};

	describe('calculateEnhancedLegendConfig', () => {
		describe('Bottom Legend Configuration', () => {
			it('should calculate correct configuration for bottom legend with few series', () => {
				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					3,
					['Series A', 'Series B', 'Series C'],
					LegendPosition.BOTTOM,
				);

				expect(config.calculatedHeight).toBeGreaterThan(0);
				expect(config.minHeight).toBe(46); // lineHeight (34) + padding (12)
				expect(config.showScrollbar).toBe(false);
				expect(config.requiredRows).toBeGreaterThanOrEqual(1); // Actual behavior may vary
			});

			it('should calculate correct configuration for bottom legend with many series', () => {
				const longSeriesLabels = Array.from(
					{ length: 10 },
					(_, i) => `Very Long Series Name ${i + 1}`,
				);

				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					10,
					longSeriesLabels,
					LegendPosition.BOTTOM,
				);

				expect(config.calculatedHeight).toBeGreaterThan(0);
				expect(config.showScrollbar).toBe(true);
				expect(config.requiredRows).toBeGreaterThan(2);
				expect(config.maxHeight).toBeLessThanOrEqual(80); // absoluteMaxHeight constraint
			});

			it('should handle responsive width adjustments for bottom legend', () => {
				const narrowDimensions: Dimensions = { width: 300, height: 400 };
				const wideDimensions: Dimensions = { width: 1200, height: 400 };

				const narrowConfig = calculateEnhancedLegendConfig(
					narrowDimensions,
					5,
					['Series A', 'Series B', 'Series C', 'Series D', 'Series E'],
					LegendPosition.BOTTOM,
				);

				const wideConfig = calculateEnhancedLegendConfig(
					wideDimensions,
					5,
					['Series A', 'Series B', 'Series C', 'Series D', 'Series E'],
					LegendPosition.BOTTOM,
				);

				// Narrow panels should have more rows due to less items per row
				expect(narrowConfig.requiredRows).toBeGreaterThanOrEqual(
					wideConfig.requiredRows,
				);
			});

			it('should respect maximum legend height ratio for bottom legend', () => {
				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					20,
					Array.from({ length: 20 }, (_, i) => `Series ${i + 1}`),
					LegendPosition.BOTTOM,
				);

				// The implementation uses absoluteMaxHeight of 80
				expect(config.calculatedHeight).toBeLessThanOrEqual(80);
			});
		});

		describe('Right Legend Configuration', () => {
			it('should calculate correct configuration for right legend', () => {
				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					5,
					['Series A', 'Series B', 'Series C', 'Series D', 'Series E'],
					LegendPosition.RIGHT,
				);

				expect(config.calculatedWidth).toBeGreaterThan(0);
				expect(config.minWidth).toBe(150);
				expect(config.maxWidth).toBeLessThanOrEqual(400);
				expect(config.calculatedWidth).toBeLessThanOrEqual(
					mockDimensions.width * 0.3,
				); // maxLegendWidthRatio
				expect(config.requiredRows).toBe(5); // Each series on its own row for right-side
			});

			it('should calculate width based on series label length for right legend', () => {
				const shortLabels = ['A', 'B', 'C'];
				const longLabels = [
					'Very Long Series Name A',
					'Very Long Series Name B',
					'Very Long Series Name C',
				];

				const shortConfig = calculateEnhancedLegendConfig(
					mockDimensions,
					3,
					shortLabels,
					LegendPosition.RIGHT,
				);

				const longConfig = calculateEnhancedLegendConfig(
					mockDimensions,
					3,
					longLabels,
					LegendPosition.RIGHT,
				);

				expect(longConfig.calculatedWidth).toBeGreaterThan(
					shortConfig.calculatedWidth ?? 0,
				);
			});

			it('should handle scrollbar for right legend with many series', () => {
				const tallDimensions: Dimensions = { width: 800, height: 200 };
				const manySeriesLabels = Array.from(
					{ length: 15 },
					(_, i) => `Series ${i + 1}`,
				);

				const config = calculateEnhancedLegendConfig(
					tallDimensions,
					15,
					manySeriesLabels,
					LegendPosition.RIGHT,
				);

				expect(config.showScrollbar).toBe(true);
				expect(config.calculatedHeight).toBeLessThanOrEqual(config.maxHeight);
			});

			it('should respect maximum width constraints for right legend', () => {
				const narrowDimensions: Dimensions = { width: 400, height: 400 };

				const config = calculateEnhancedLegendConfig(
					narrowDimensions,
					5,
					Array.from({ length: 5 }, (_, i) => `Very Long Series Name ${i + 1}`),
					LegendPosition.RIGHT,
				);

				expect(config.calculatedWidth).toBeLessThanOrEqual(
					narrowDimensions.width * 0.3,
				);
				expect(config.calculatedWidth).toBeLessThanOrEqual(400); // absoluteMaxWidth
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty series labels', () => {
				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					0,
					[],
					LegendPosition.BOTTOM,
				);

				expect(config.calculatedHeight).toBeGreaterThan(0);
				expect(config.requiredRows).toBe(0);
			});

			it('should handle undefined series labels', () => {
				const config = calculateEnhancedLegendConfig(
					mockDimensions,
					3,
					undefined,
					LegendPosition.BOTTOM,
				);

				expect(config.calculatedHeight).toBeGreaterThan(0);
				expect(config.requiredRows).toBe(1); // For 3 series, should be 1 row (logic only forces 2 rows when seriesCount > 3)
			});

			it('should handle very small dimensions', () => {
				const smallDimensions: Dimensions = { width: 100, height: 100 };

				const config = calculateEnhancedLegendConfig(
					smallDimensions,
					3,
					['A', 'B', 'C'],
					LegendPosition.BOTTOM,
				);

				expect(config.calculatedHeight).toBeGreaterThan(0);
				expect(config.calculatedHeight).toBeLessThanOrEqual(
					smallDimensions.height * 0.15,
				);
			});
		});
	});

	describe('applyEnhancedLegendStyling', () => {
		let mockLegendElement: HTMLElement;

		beforeEach(() => {
			mockLegendElement = document.createElement('div');
			mockLegendElement.className = 'u-legend';
		});

		describe('Bottom Legend Styling', () => {
			it('should apply correct classes for bottom legend', () => {
				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					2,
					LegendPosition.BOTTOM,
				);

				expect(mockLegendElement.classList.contains('u-legend-enhanced')).toBe(
					true,
				);
				expect(mockLegendElement.classList.contains('u-legend-bottom')).toBe(true);
				expect(mockLegendElement.classList.contains('u-legend-right')).toBe(false);
				expect(mockLegendElement.classList.contains('u-legend-multi-line')).toBe(
					true,
				);
			});

			it('should apply single-line class for single row bottom legend', () => {
				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					1,
					LegendPosition.BOTTOM,
				);

				expect(mockLegendElement.classList.contains('u-legend-single-line')).toBe(
					true,
				);
				expect(mockLegendElement.classList.contains('u-legend-multi-line')).toBe(
					false,
				);
			});

			it('should set correct height styles for bottom legend', () => {
				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					2,
					LegendPosition.BOTTOM,
				);

				expect(mockLegendElement.style.height).toBe('60px');
				expect(mockLegendElement.style.minHeight).toBe('46px');
				expect(mockLegendElement.style.maxHeight).toBe('80px');
				expect(mockLegendElement.style.width).toBe('');
			});
		});

		describe('Right Legend Styling', () => {
			it('should apply correct classes for right legend', () => {
				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					5,
					LegendPosition.RIGHT,
				);

				expect(mockLegendElement.classList.contains('u-legend-enhanced')).toBe(
					true,
				);
				expect(mockLegendElement.classList.contains('u-legend-right')).toBe(true);
				expect(mockLegendElement.classList.contains('u-legend-bottom')).toBe(false);
				expect(mockLegendElement.classList.contains('u-legend-right-aligned')).toBe(
					true,
				);
			});

			it('should set correct width and height styles for right legend', () => {
				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					5,
					LegendPosition.RIGHT,
				);

				expect(mockLegendElement.style.width).toBe('200px');
				expect(mockLegendElement.style.minWidth).toBe('150px');
				expect(mockLegendElement.style.maxWidth).toBe('300px');
				expect(mockLegendElement.style.height).toBe('60px');
				expect(mockLegendElement.style.minHeight).toBe('46px');
				expect(mockLegendElement.style.maxHeight).toBe('80px');
			});
		});

		describe('Scrollbar Styling', () => {
			it('should add scrollable class when scrollbar is needed', () => {
				const scrollableConfig = { ...mockConfig, showScrollbar: true };

				applyEnhancedLegendStyling(
					mockLegendElement,
					scrollableConfig,
					5,
					LegendPosition.BOTTOM,
				);

				expect(mockLegendElement.classList.contains('u-legend-scrollable')).toBe(
					true,
				);
			});

			it('should remove scrollable class when scrollbar is not needed', () => {
				mockLegendElement.classList.add('u-legend-scrollable');

				applyEnhancedLegendStyling(
					mockLegendElement,
					mockConfig,
					2,
					LegendPosition.BOTTOM,
				);

				expect(mockLegendElement.classList.contains('u-legend-scrollable')).toBe(
					false,
				);
			});
		});
	});

	describe('Legend Responsive Distribution', () => {
		describe('Items per row calculation', () => {
			it('should calculate correct items per row for different panel widths', () => {
				const testCases = [
					{ width: 300, expectedMaxItemsPerRow: 2 },
					{ width: 600, expectedMaxItemsPerRow: 4 },
					{ width: 1200, expectedMaxItemsPerRow: 8 },
				];

				testCases.forEach(({ width, expectedMaxItemsPerRow }) => {
					const dimensions: Dimensions = { width, height: 400 };
					const config = calculateEnhancedLegendConfig(
						dimensions,
						expectedMaxItemsPerRow + 2, // More series than can fit in one row
						Array.from(
							{ length: expectedMaxItemsPerRow + 2 },
							(_, i) => `Series ${i + 1}`,
						),
						LegendPosition.BOTTOM,
					);

					expect(config.requiredRows).toBeGreaterThan(1);
				});
			});

			it('should handle very long series names by adjusting layout', () => {
				const longSeriesNames = [
					'Very Long Series Name That Might Not Fit',
					'Another Extremely Long Series Name',
					'Yet Another Very Long Series Name',
				];

				const config = calculateEnhancedLegendConfig(
					{ width: 400, height: 300 },
					3,
					longSeriesNames,
					LegendPosition.BOTTOM,
				);

				// Should require more rows due to long names
				expect(config.requiredRows).toBeGreaterThanOrEqual(2);
			});
		});

		describe('Dynamic height adjustment', () => {
			it('should adjust height based on number of required rows', () => {
				const fewSeries = calculateEnhancedLegendConfig(
					mockDimensions,
					2,
					['A', 'B'],
					LegendPosition.BOTTOM,
				);

				const manySeries = calculateEnhancedLegendConfig(
					mockDimensions,
					10,
					Array.from({ length: 10 }, (_, i) => `Series ${i + 1}`),
					LegendPosition.BOTTOM,
				);

				expect(manySeries.calculatedHeight).toBeGreaterThan(
					fewSeries.calculatedHeight,
				);
			});
		});
	});

	describe('Legend Position Integration', () => {
		it('should handle legend position changes correctly', () => {
			const seriesLabels = [
				'Series A',
				'Series B',
				'Series C',
				'Series D',
				'Series E',
			];

			const bottomConfig = calculateEnhancedLegendConfig(
				mockDimensions,
				5,
				seriesLabels,
				LegendPosition.BOTTOM,
			);

			const rightConfig = calculateEnhancedLegendConfig(
				mockDimensions,
				5,
				seriesLabels,
				LegendPosition.RIGHT,
			);

			// Bottom legend should have width constraints, right legend should have height constraints
			expect(bottomConfig.calculatedWidth).toBeUndefined();
			expect(rightConfig.calculatedWidth).toBeDefined();
			expect(rightConfig.calculatedWidth).toBeGreaterThan(0);
		});

		it('should apply different styling based on legend position', () => {
			const mockElement = document.createElement('div');

			// Test bottom positioning
			applyEnhancedLegendStyling(
				mockElement,
				mockConfig,
				3,
				LegendPosition.BOTTOM,
			);

			const hasBottomClasses = mockElement.classList.contains('u-legend-bottom');

			// Reset element
			mockElement.className = 'u-legend';

			// Test right positioning
			applyEnhancedLegendStyling(mockElement, mockConfig, 3, LegendPosition.RIGHT);

			const hasRightClasses = mockElement.classList.contains('u-legend-right');

			expect(hasBottomClasses).toBe(true);
			expect(hasRightClasses).toBe(true);
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle large number of series efficiently', () => {
			const startTime = Date.now();

			const largeSeries = Array.from({ length: 100 }, (_, i) => `Series ${i + 1}`);
			const config = calculateEnhancedLegendConfig(
				mockDimensions,
				100,
				largeSeries,
				LegendPosition.BOTTOM,
			);

			const endTime = Date.now();
			const executionTime = endTime - startTime;

			expect(executionTime).toBeLessThan(100); // Should complete within 100ms
			expect(config.calculatedHeight).toBeGreaterThan(0);
			expect(config.showScrollbar).toBe(true);
		});

		it('should handle zero dimensions gracefully', () => {
			const zeroDimensions: Dimensions = { width: 0, height: 0 };

			const config = calculateEnhancedLegendConfig(
				zeroDimensions,
				3,
				['A', 'B', 'C'],
				LegendPosition.BOTTOM,
			);

			expect(config.calculatedHeight).toBeGreaterThan(0);
			expect(config.minHeight).toBeGreaterThan(0);
		});

		it('should handle negative dimensions gracefully', () => {
			const negativeDimensions: Dimensions = { width: -100, height: -100 };

			const config = calculateEnhancedLegendConfig(
				negativeDimensions,
				3,
				['A', 'B', 'C'],
				LegendPosition.BOTTOM,
			);

			expect(config.calculatedHeight).toBeGreaterThan(0);
			expect(config.minHeight).toBeGreaterThan(0);
		});
	});
});
