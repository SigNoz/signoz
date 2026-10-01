import { summarizeChartAppearance } from '../summary';

describe('summarizeChartAppearance points', () => {
	it('reads one size when nothing sizes the dots', () => {
		expect(
			summarizeChartAppearance({ points: { size: 8 } }, { points: true }, {}),
		).toBe('8 px dots, 70%');
	});

	it('reads the range when a size column is bound', () => {
		expect(
			summarizeChartAppearance(
				{ points: { minSize: 3, opacity: 0.5 } },
				{ points: true },
				{ sizeColumnLabel: 'B.count()' },
			),
		).toBe('3–24 px dots, 50%');
	});

	it('says nothing about points for a kind without them', () => {
		expect(summarizeChartAppearance(undefined, { showPoints: true }, {})).toBe(
			'',
		);
	});
});
