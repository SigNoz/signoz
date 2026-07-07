import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesComparisonThresholdDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

import { mapNumberThresholds } from '../utils';

describe('mapNumberThresholds', () => {
	it('returns [] for null / undefined / empty', () => {
		expect(mapNumberThresholds(null)).toStrictEqual([]);
		expect(mapNumberThresholds(undefined)).toStrictEqual([]);
		expect(mapNumberThresholds([])).toStrictEqual([]);
	});

	it('maps comparison operators to symbol operators', () => {
		const thresholds: DashboardtypesComparisonThresholdDTO[] = [
			{
				color: '#f00',
				operator: DashboardtypesComparisonOperatorDTO.above,
				value: 1,
			},
			{
				color: '#0f0',
				operator: DashboardtypesComparisonOperatorDTO.below,
				value: 2,
			},
			{
				color: '#00f',
				operator: DashboardtypesComparisonOperatorDTO.above_or_equal,
				value: 3,
			},
			{
				color: '#ff0',
				operator: DashboardtypesComparisonOperatorDTO.below_or_equal,
				value: 4,
			},
			{
				color: '#0ff',
				operator: DashboardtypesComparisonOperatorDTO.equal,
				value: 5,
			},
		];

		const mapped = mapNumberThresholds(thresholds);

		expect(mapped.map((t) => t.operator)).toStrictEqual([
			'>',
			'<',
			'>=',
			'<=',
			'=',
		]);
	});

	it('maps not_equal to !=', () => {
		const mapped = mapNumberThresholds([
			{
				color: '#f00',
				operator: DashboardtypesComparisonOperatorDTO.not_equal,
				value: 1,
			},
		]);

		expect(mapped[0].operator).toBe('!=');
	});

	it('maps format and carries value/unit/color', () => {
		const mapped = mapNumberThresholds([
			{
				color: '#abcdef',
				operator: DashboardtypesComparisonOperatorDTO.above,
				value: 100,
				unit: 'ms',
				format: DashboardtypesThresholdFormatDTO.background,
			},
		]);

		expect(mapped[0]).toStrictEqual({
			color: '#abcdef',
			operator: '>',
			value: 100,
			unit: 'ms',
			format: 'background',
		});
	});

	it('maps text format to text', () => {
		const mapped = mapNumberThresholds([
			{
				color: '#000',
				value: 1,
				format: DashboardtypesThresholdFormatDTO.text,
			},
		]);

		expect(mapped[0].format).toBe('text');
	});
});
