import {
	combineInitialAndUserExpression,
	getUserExpressionFromCombined,
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
