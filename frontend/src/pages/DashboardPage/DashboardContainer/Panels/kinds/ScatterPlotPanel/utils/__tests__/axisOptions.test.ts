import { DashboardtypesThresholdAxisDTO } from 'api/generated/services/sigNoz.schemas';

import { getAxisThresholds, toScatterAxisOptions } from '../axisOptions';

const X_LINE = {
	value: 50,
	color: '#00f',
	axis: DashboardtypesThresholdAxisDTO.x,
};
const Y_LINE = {
	value: 300,
	color: '#f00',
	axis: DashboardtypesThresholdAxisDTO.y,
};
const UNSET_LINE = { value: 10, color: '#0f0' };

describe('getAxisThresholds', () => {
	it('splits thresholds by axis, counting an unset axis as y', () => {
		const thresholds = [X_LINE, Y_LINE, UNSET_LINE];

		expect(
			getAxisThresholds(thresholds, DashboardtypesThresholdAxisDTO.x),
		).toStrictEqual([X_LINE]);
		expect(
			getAxisThresholds(thresholds, DashboardtypesThresholdAxisDTO.y),
		).toStrictEqual([Y_LINE, UNSET_LINE]);
	});

	it('is empty without thresholds', () => {
		expect(
			getAxisThresholds(null, DashboardtypesThresholdAxisDTO.y),
		).toStrictEqual([]);
	});
});

describe('toScatterAxisOptions', () => {
	it('carries the axis thresholds onto the chart axis', () => {
		expect(
			toScatterAxisOptions(undefined, 'reqps', [X_LINE]).thresholds,
		).toStrictEqual([
			{
				thresholdValue: 50,
				thresholdColor: '#00f',
				thresholdUnit: undefined,
				thresholdLabel: undefined,
			},
		]);
	});
});
