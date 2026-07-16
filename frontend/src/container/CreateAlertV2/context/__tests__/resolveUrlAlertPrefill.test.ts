import { AlertThresholdMatchType, AlertThresholdOperator } from '../types';
import {
	EvaluationWindowPreset,
	resolveUrlAlertPrefill,
} from '../resolveUrlAlertPrefill';

function resolve(search: string): ReturnType<typeof resolveUrlAlertPrefill> {
	return resolveUrlAlertPrefill(new URLSearchParams(search));
}

describe('resolveUrlAlertPrefill', () => {
	it('returns an empty plan when no params are present', () => {
		expect(resolve('')).toStrictEqual({
			thresholds: undefined,
			matchType: undefined,
			operator: undefined,
			evaluationWindowPreset: undefined,
		});
	});

	it('parses a thresholds array', () => {
		const thresholds = [{ id: 't1', thresholdValue: 90 }];
		const { thresholds: parsed } = resolve(
			`thresholds=${encodeURIComponent(JSON.stringify(thresholds))}`,
		);
		expect(parsed).toStrictEqual(thresholds);
	});

	it('ignores malformed or non-array thresholds without throwing', () => {
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(resolve('thresholds=not-json').thresholds).toBeUndefined();
		expect(
			resolve(`thresholds=${encodeURIComponent('{"a":1}')}`).thresholds,
		).toBeUndefined();

		consoleError.mockRestore();
	});

	it('normalizes matchType aliases', () => {
		expect(resolve('matchType=on_average').matchType).toBe(
			AlertThresholdMatchType.ON_AVERAGE,
		);
		expect(resolve('matchType=sum').matchType).toBe(
			AlertThresholdMatchType.IN_TOTAL,
		);
		expect(resolve('matchType=nonsense').matchType).toBeUndefined();
	});

	it('normalizes operator aliases', () => {
		expect(resolve('compareOp=above').operator).toBe(
			AlertThresholdOperator.IS_ABOVE,
		);
		expect(resolve('compareOp=%3E').operator).toBe(
			AlertThresholdOperator.IS_ABOVE,
		);
		expect(resolve('compareOp=nonsense').operator).toBeUndefined();
	});

	it('recognizes the meter evaluation-window preset only', () => {
		expect(resolve('evaluationWindowPreset=meter').evaluationWindowPreset).toBe(
			EvaluationWindowPreset.METER,
		);
		expect(
			resolve('evaluationWindowPreset=rolling').evaluationWindowPreset,
		).toBeUndefined();
		expect(resolve('').evaluationWindowPreset).toBeUndefined();
	});
});
