import getLabelName from 'lib/getLabelName';

describe('getLabelName', () => {
	describe('with a legend template', () => {
		it('substitutes a single variable that exists on the series', () => {
			const result = getLabelName(
				{ 'service.name': 'frontend' },
				'A',
				'{{service.name}}',
			);
			expect(result).toBe('frontend');
		});

		it('substitutes a template with surrounding literal text', () => {
			const result = getLabelName(
				{ 'service.name': 'frontend' },
				'A',
				'rate for {{service.name}}',
			);
			expect(result).toBe('rate for frontend');
		});

		it('substitutes multiple variables when all are present', () => {
			const result = getLabelName(
				{ 'service.name': 'frontend', 'http.target': 'GET /api' },
				'A',
				'{{service.name}} / {{http.target}}',
			);
			expect(result).toBe('frontend / GET /api');
		});

		it('falls back to query name when a referenced variable is missing', () => {
			const result = getLabelName(
				{ 'http.target': 'GET /api' },
				'F1',
				'{{service.name}}',
			);
			expect(result).toBe('F1');
		});

		it('falls back to query name even if literal text would still render', () => {
			const result = getLabelName(
				{ 'http.target': 'GET /api' },
				'F1',
				'label = {{label}}',
			);
			expect(result).toBe('F1');
		});

		it('falls back to query name when any of multiple variables is missing', () => {
			const result = getLabelName(
				{ 'service.name': 'frontend' },
				'F1',
				'{{service.name}} / {{http.target}}',
			);
			expect(result).toBe('F1');
		});

		it('treats a null label value as missing', () => {
			const result = getLabelName(
				{ 'service.name': null } as unknown as Record<string, string>,
				'F1',
				'{{service.name}}',
			);
			expect(result).toBe('F1');
		});
	});

	describe('without a legend template', () => {
		it('returns key="value" pairs for plain labels', () => {
			const result = getLabelName(
				{ 'service.name': 'frontend', 'http.target': 'GET /api' },
				'A',
				'',
			);
			expect(result).toBe('{service.name="frontend",http.target="GET /api"}');
		});

		it('returns query name when labels are empty', () => {
			const result = getLabelName({}, 'A', '');
			expect(result).toBe('A');
		});
	});
});
