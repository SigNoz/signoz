import {
	validateQuery,
	validateTraceOperatorQuery,
} from './queryValidationUtils';

describe('filter query syntax errors', () => {
	it.each([
		['service.name =', 'Add a value', 1, 14],
		['service.name = "api', 'Close the quoted text', 1, 15],
		["service.name = 'api", 'Close the quoted text', 1, 15],
		['(service.name = api', 'Add a closing parenthesis', 1, 19],
		['service.name IN (api,)', 'Add a value', 1, 21],
		['service.name = api)', 'Remove the unexpected', 1, 18],
		['service.name = api AND', 'Add a filter expression', 1, 22],
		['has(', 'Add a function argument', 1, 4],
		['service.name IN [api', 'Add a closing bracket', 1, 20],
		['service.name = api\nAND )', 'Add a filter expression', 2, 4],
	])('explains malformed query %s', (query, message, line, column) => {
		const result = validateQuery(query);
		expect(result.isValid).toBe(false);
		expect(result.errors[0]).toMatchObject({
			message: expect.stringContaining(message),
			line,
			column,
		});
		for (const error of result.errors) {
			expect(error.message).not.toMatch(
				/token recognition|mismatched input|extraneous input|no viable alternative|<EOF>|BOOL|QUOTED_TEXT|FREETEXT|HASTOKEN/,
			);
		}
	});

	it.each([
		'',
		'service.name = api',
		'service.name IN (api, worker)',
		'(service.name = api) AND duration > 10',
		'has(payload.user_ids, 123)',
		'search("connection failed")',
	])('preserves valid query %s', (query) => {
		expect(validateQuery(query)).toMatchObject({ isValid: true, errors: [] });
	});

	it('shows one actionable error for an unfinished quote', () => {
		expect(validateQuery('service.name = "api').errors).toHaveLength(1);
	});

	it('bounds long token labels without losing the original symbol', () => {
		const token = 'z'.repeat(1000);
		const result = validateQuery(`service.name IN (api, ${token} ${token})`);
		expect(result.isValid).toBe(false);
		const error = result.errors.find((item) => item.offendingSymbol === token);
		expect(error).toBeDefined();
		expect(error?.message).toContain(`"${'z'.repeat(40)}..."`);
		expect(error?.message.length).toBeLessThan(100);
		expect(error?.offendingSymbol).toBe(token);
	});

	it('does not change trace operator errors', () => {
		expect(validateTraceOperatorQuery('A =>').errors[0].message).toBe(
			"no viable alternative at input 'A=>'",
		);
	});
});
