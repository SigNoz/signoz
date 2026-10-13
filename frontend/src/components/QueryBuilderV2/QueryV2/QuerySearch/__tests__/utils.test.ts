import { QUERY_BUILDER_FUNCTIONS } from 'constants/antlrQueryConstants';
import { DataSource } from 'types/common/queryBuilder';

import {
	combineInitialAndUserExpression,
	dedupeOptionsByLabel,
	getUserExpressionFromCombined,
	isSupportedFunction,
} from '../utils';

describe('entityLogsExpression', () => {
	describe('combineInitialAndUserExpression', () => {
		it('returns user when initial is empty', () => {
			expect(combineInitialAndUserExpression('', 'body contains error')).toBe(
				'body contains error',
			);
		});

		it('returns initial when user is empty', () => {
			expect(combineInitialAndUserExpression('k8s.pod.name = "x"', '')).toBe(
				'k8s.pod.name = "x"',
			);
		});

		it('wraps user in parentheses with AND', () => {
			expect(
				combineInitialAndUserExpression('k8s.pod.name = "x"', 'body = "a"'),
			).toBe('k8s.pod.name = "x" AND (body = "a")');
		});
	});

	describe('getUserExpressionFromCombined', () => {
		it('returns empty when combined equals initial', () => {
			expect(
				getUserExpressionFromCombined('k8s.pod.name = "x"', 'k8s.pod.name = "x"'),
			).toBe('');
		});

		it('extracts user from wrapped form', () => {
			expect(
				getUserExpressionFromCombined(
					'k8s.pod.name = "x"',
					'k8s.pod.name = "x" AND (body = "a")',
				),
			).toBe('body = "a"');
		});

		it('extracts user from legacy AND without parens', () => {
			expect(
				getUserExpressionFromCombined(
					'k8s.pod.name = "x"',
					'k8s.pod.name = "x" AND body = "a"',
				),
			).toBe('body = "a"');
		});

		it('returns full combined when initial is empty', () => {
			expect(getUserExpressionFromCombined('', 'service.name = "a"')).toBe(
				'service.name = "a"',
			);
		});
	});
});

describe('dedupeOptionsByLabel', () => {
	it('keeps the first occurrence per label, preserving order', () => {
		expect(
			dedupeOptionsByLabel([
				{ label: 'status.code', type: 'keyword' },
				{ label: 'status.code', type: 'number' },
				{ label: 'duration', type: 'number' },
			]),
		).toStrictEqual([
			{ label: 'status.code', type: 'keyword' },
			{ label: 'duration', type: 'number' },
		]);
	});

	it('returns an empty array for empty input', () => {
		expect(dedupeOptionsByLabel([])).toStrictEqual([]);
	});
});

describe('isSupportedFunction', () => {
	const { HASANY, SEARCH } = QUERY_BUILDER_FUNCTIONS;

	it('allows the has family on every signal', () => {
		[DataSource.LOGS, DataSource.TRACES, DataSource.METRICS].forEach((signal) => {
			expect(isSupportedFunction(HASANY, signal)).toBe(true);
		});
	});

	it('allows search on logs only', () => {
		expect(isSupportedFunction(SEARCH, DataSource.LOGS)).toBe(true);
		expect(isSupportedFunction(SEARCH, DataSource.TRACES)).toBe(false);
		expect(isSupportedFunction(SEARCH, DataSource.METRICS)).toBe(false);
	});
});
