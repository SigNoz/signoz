import { withVariablesSearch } from '../variablesUrlState';

jest.mock('nuqs', () => ({
	parseAsJson: (): unknown => ({ withOptions: (): unknown => ({}) }),
}));

describe('withVariablesSearch', () => {
	const current = `?compositeQuery=abc&variables=${encodeURIComponent(
		'{"env":"prod"}',
	)}`;

	it('returns the base unchanged when the current search has no variables', () => {
		expect(withVariablesSearch('', '?compositeQuery=abc')).toBe('');
		expect(withVariablesSearch('?panelKind=signoz/TablePanel', '')).toBe(
			'?panelKind=signoz/TablePanel',
		);
	});

	it('carries only the variables param onto an empty base', () => {
		const result = withVariablesSearch('', current);
		expect(new URLSearchParams(result).get('variables')).toBe('{"env":"prod"}');
		expect(new URLSearchParams(result).get('compositeQuery')).toBeNull();
	});

	it('appends the variables param to existing base params', () => {
		const result = withVariablesSearch('?panelKind=signoz/TablePanel', current);
		const params = new URLSearchParams(result);
		expect(params.get('panelKind')).toBe('signoz/TablePanel');
		expect(params.get('variables')).toBe('{"env":"prod"}');
	});
});
