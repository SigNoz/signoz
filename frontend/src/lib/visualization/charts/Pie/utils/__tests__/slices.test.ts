import type { PieSlice } from 'lib/visualization/charts/types';
import { compareSlices } from 'lib/visualization/charts/Pie/utils/slices';

describe('Pie slices', () => {
	describe('compareSlices', () => {
		it('orders largest first with the grouped slice last', () => {
			const slice = (label: string, value: number, grouped = false): PieSlice => ({
				label,
				value,
				color: '#000000',
				...(grouped ? { members: [] } : {}),
			});
			const slices = [
				slice('small', 1),
				slice('Other', 500, true),
				slice('big', 100),
			];

			expect([...slices].sort(compareSlices).map((s) => s.label)).toStrictEqual([
				'big',
				'small',
				'Other',
			]);
		});
	});
});
