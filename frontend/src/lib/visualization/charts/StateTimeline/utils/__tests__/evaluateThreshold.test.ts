import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';

import { evaluateThreshold } from '../evaluateThreshold';

const DEFAULT_COLOR = '#9CA3AF';

function threshold(
	value: number,
	color: string,
	label?: string,
): DashboardtypesThresholdWithLabelDTO {
	return { value, color, label };
}

describe('evaluateThreshold (band semantics)', () => {
	it('returns defaultColor for a null value', () => {
		expect(
			evaluateThreshold(null, [threshold(0, '#FF0000')], DEFAULT_COLOR),
		).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('returns defaultColor for a NaN value', () => {
		expect(
			evaluateThreshold(NaN, [threshold(0, '#FF0000')], DEFAULT_COLOR),
		).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('returns defaultColor when the thresholds array is empty', () => {
		expect(evaluateThreshold(50, [], DEFAULT_COLOR)).toStrictEqual({
			color: DEFAULT_COLOR,
		});
	});

	it('picks the highest threshold at or below the value', () => {
		const thresholds = [
			threshold(0, '#FF0000', 'Fail'),
			threshold(1, '#00FF00', 'Pass'),
		];
		expect(evaluateThreshold(1, thresholds, DEFAULT_COLOR)).toStrictEqual({
			color: '#00FF00',
			label: 'Pass',
		});
		expect(evaluateThreshold(0, thresholds, DEFAULT_COLOR)).toStrictEqual({
			color: '#FF0000',
			label: 'Fail',
		});
	});

	it('is independent of the declared order of thresholds', () => {
		const unordered = [
			threshold(80, '#FF0000', 'Critical'),
			threshold(0, '#00FF00', 'OK'),
			threshold(50, '#FFAA00', 'Warning'),
		];
		expect(evaluateThreshold(90, unordered, DEFAULT_COLOR)).toStrictEqual({
			color: '#FF0000',
			label: 'Critical',
		});
		expect(evaluateThreshold(60, unordered, DEFAULT_COLOR)).toStrictEqual({
			color: '#FFAA00',
			label: 'Warning',
		});
		expect(evaluateThreshold(10, unordered, DEFAULT_COLOR)).toStrictEqual({
			color: '#00FF00',
			label: 'OK',
		});
	});

	it('returns defaultColor when the value is below every threshold', () => {
		expect(
			evaluateThreshold(50, [threshold(80, '#FF0000')], DEFAULT_COLOR),
		).toStrictEqual({ color: DEFAULT_COLOR });
	});

	it('matches a threshold whose value is exactly the point value', () => {
		expect(
			evaluateThreshold(0, [threshold(0, '#0000FF', 'Zero')], DEFAULT_COLOR),
		).toStrictEqual({ color: '#0000FF', label: 'Zero' });
	});

	it('omits the label when the matching threshold has none', () => {
		expect(
			evaluateThreshold(10, [threshold(0, '#FF0000')], DEFAULT_COLOR),
		).toStrictEqual({ color: '#FF0000', label: undefined });
	});

	it('handles negative threshold values', () => {
		const thresholds = [
			threshold(-10, '#111111', 'low'),
			threshold(0, '#222222', 'mid'),
		];
		expect(evaluateThreshold(-5, thresholds, DEFAULT_COLOR)).toStrictEqual({
			color: '#111111',
			label: 'low',
		});
		expect(evaluateThreshold(-20, thresholds, DEFAULT_COLOR)).toStrictEqual({
			color: DEFAULT_COLOR,
		});
	});

	it('does not mutate the input array', () => {
		const thresholds = [threshold(5, '#a'), threshold(1, '#b')];
		const snapshot = [...thresholds];
		evaluateThreshold(3, thresholds, DEFAULT_COLOR);
		expect(thresholds).toStrictEqual(snapshot);
	});
});
