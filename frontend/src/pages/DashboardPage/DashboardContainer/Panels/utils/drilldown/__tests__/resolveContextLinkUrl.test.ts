import { resolveContextLinkUrl } from '../resolveContextLinkUrl';

describe('resolveContextLinkUrl', () => {
	const vars = { timestamp_start: '1720512000000', service_name: 'frontend' };

	it('resolves a variable in the base URL path', () => {
		expect(
			resolveContextLinkUrl('https://google.com/{{timestamp_start}}', vars),
		).toBe('https://google.com/1720512000000');
	});

	it('resolves variables in query params', () => {
		expect(
			resolveContextLinkUrl('https://x.com/d?service={{service_name}}', vars),
		).toBe('https://x.com/d?service=frontend');
	});

	// Regression: a literal `%` must not abort resolution of the base-URL variable.
	it('keeps resolving when a param value contains a literal %', () => {
		expect(
			resolveContextLinkUrl(
				'https://google.com/{{timestamp_start}}?name=95%',
				vars,
			),
		).toBe('https://google.com/1720512000000?name=95%25');
	});

	it('resolves both a base-URL variable and a param variable together', () => {
		expect(
			resolveContextLinkUrl(
				'https://x.com/{{service_name}}?ts={{timestamp_start}}',
				vars,
			),
		).toBe('https://x.com/frontend?ts=1720512000000');
	});

	it('leaves an unknown variable token untouched', () => {
		expect(resolveContextLinkUrl('https://x.com/{{unknown}}', vars)).toBe(
			'https://x.com/{{unknown}}',
		);
	});

	it('returns the base URL unchanged when there is no query string', () => {
		expect(resolveContextLinkUrl('https://x.com/plain', vars)).toBe(
			'https://x.com/plain',
		);
	});

	it('decodes double-encoded param values before resolving', () => {
		expect(
			resolveContextLinkUrl(
				'https://x.com/d?ts=%257B%257Btimestamp_start%257D%257D',
				vars,
			),
		).toBe('https://x.com/d?ts=1720512000000');
	});
});
