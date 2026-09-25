import {
	resolveLabelFromLabels,
	resolveLegendTemplate,
} from '../legendResolver';

describe('resolveLegendTemplate', () => {
	it('replaces a single placeholder', () => {
		expect(resolveLegendTemplate('{{service}}', { service: 'api' })).toBe('api');
	});

	it('replaces multiple placeholders', () => {
		expect(
			resolveLegendTemplate('{{service}} / {{env}}', {
				service: 'api',
				env: 'prod',
			}),
		).toBe('api / prod');
	});

	it('trims whitespace inside placeholders', () => {
		expect(resolveLegendTemplate('{{ service }}', { service: 'api' })).toBe(
			'api',
		);
	});

	it('leaves unmatched placeholders as-is', () => {
		expect(resolveLegendTemplate('{{missing}}', { service: 'api' })).toBe(
			'{{missing}}',
		);
	});

	it('returns a template without placeholders unchanged', () => {
		expect(resolveLegendTemplate('static label', { service: 'api' })).toBe(
			'static label',
		);
	});
});

describe('resolveLabelFromLabels', () => {
	it('interpolates the template when provided', () => {
		expect(resolveLabelFromLabels({ service: 'api' }, '{{service}}')).toBe('api');
	});

	it('shows just the value for a single label (no key= prefix)', () => {
		expect(resolveLabelFromLabels({ title: 'ACA - Status Over Time' })).toBe(
			'ACA - Status Over Time',
		);
	});

	it('falls back to key=value pairs for multiple labels', () => {
		expect(resolveLabelFromLabels({ service: 'api', env: 'prod' })).toBe(
			'service=api, env=prod',
		);
	});

	it('returns an empty string for no labels and no template', () => {
		expect(resolveLabelFromLabels({})).toBe('');
	});

	it('prefers the template over the key=value fallback', () => {
		expect(
			resolveLabelFromLabels({ service: 'api', env: 'prod' }, '{{env}}'),
		).toBe('prod');
	});
});
