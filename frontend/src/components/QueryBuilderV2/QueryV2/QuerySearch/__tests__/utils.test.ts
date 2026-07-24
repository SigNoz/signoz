import {
	combineInitialAndUserExpression,
	dedupeOptionsByLabel,
	getFieldContextPrefix,
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

describe('getFieldContextPrefix', () => {
	it('matches a complete context prefix with a remainder', () => {
		expect(getFieldContextPrefix('attribute.status')).toStrictEqual({
			context: 'attribute',
			remainder: 'status',
		});
	});

	it('matches a bare context prefix with empty remainder', () => {
		expect(getFieldContextPrefix('resource.')).toStrictEqual({
			context: 'resource',
			remainder: '',
		});
	});

	it('matches every backend field context', () => {
		['attribute', 'resource', 'span', 'body', 'log', 'metric'].forEach((ctx) => {
			expect(getFieldContextPrefix(`${ctx}.x`)).toStrictEqual({
				context: ctx,
				remainder: 'x',
			});
		});
	});

	it('does not match a partial context name', () => {
		expect(getFieldContextPrefix('attr')).toBeNull();
		expect(getFieldContextPrefix('attribute')).toBeNull();
	});

	it('does not match a non-context key with dots', () => {
		expect(getFieldContextPrefix('status.code')).toBeNull();
	});

	it('matches context case-insensitively but keeps remainder casing', () => {
		expect(getFieldContextPrefix('Attribute.Status')).toStrictEqual({
			context: 'attribute',
			remainder: 'Status',
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
