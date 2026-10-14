import getLabelName from './getLabelName';

describe('getLabelName', () => {
	it('should substitute a legend variable present in the metric', () => {
		const metric = { 'service.name': 'checkoutservice' };

		const result = getLabelName(metric, '', '{{service.name}}');

		expect(result).toBe('checkoutservice');
	});

	it('should resolve a missing legend variable to an empty string instead of "undefined"', () => {
		const metric = { 'http.method': 'GET' };

		const result = getLabelName(metric, '', '{{service.name}}');

		expect(result).toBe('');
	});

	it('should resolve dotted attribute keys', () => {
		const metric = { 'deployment.environment': 'production' };

		const result = getLabelName(metric, '', 'env: {{deployment.environment}}');

		expect(result).toBe('env: production');
	});

	it('should substitute every occurrence of a repeated legend variable', () => {
		const metric = { 'service.name': 'checkoutservice' };

		const result = getLabelName(
			metric,
			'',
			'{{service.name}} - {{service.name}}',
		);

		expect(result).toBe('checkoutservice - checkoutservice');
	});

	it('should return an empty string when metric is undefined', () => {
		const metric = undefined as unknown as Record<string, string>;

		const result = getLabelName(metric, '', '{{service.name}}');

		expect(result).toBe('');
	});
});
