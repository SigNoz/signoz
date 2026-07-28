import { renderHook } from '@testing-library/react';

import useContextVariables, { resolveTexts } from '../useContextVariables';

jest.mock('hooks/dashboard/useDashboardVariables', () => ({
	useDashboardVariables: jest.fn(() => ({ dashboardVariables: {} })),
}));

// eslint-disable-next-line no-restricted-imports
jest.mock('react-redux', () => ({
	useSelector: jest.fn(() => ({ minTime: 0, maxTime: 0 })),
}));

describe('useContextVariables', () => {
	it('resolves custom (per-row) variables referenced by their bare name', () => {
		const { result } = renderHook(() =>
			useContextVariables({ customVariables: { trace_id: 'abc123' } }),
		);

		// Custom variables are namespaced internally to avoid clashing with
		// dashboard/global variables of the same name.
		expect(result.current.processedVariables).toMatchObject({
			_trace_id: 'abc123',
		});
	});

	it('resolves {{var}} templates against namespaced custom variables', () => {
		const processedVariables = { _trace_id: 'abc123', _span_id: 'def456' };

		const { fullTexts } = resolveTexts({
			texts: ['/trace/{{trace_id}}?spanId={{span_id}}'],
			processedVariables,
		});

		expect(fullTexts).toStrictEqual(['/trace/abc123?spanId=def456']);
	});

	it('resolves [[var]] templates against namespaced custom variables', () => {
		const processedVariables = { _trace_id: 'abc123' };

		const { fullTexts } = resolveTexts({
			texts: ['/trace/[[trace_id]]'],
			processedVariables,
		});

		expect(fullTexts).toStrictEqual(['/trace/abc123']);
	});

	it('still resolves variables stored without a prefix (dashboard/global vars)', () => {
		const processedVariables = { 'service.name': 'checkout-service' };

		const { fullTexts } = resolveTexts({
			texts: ['Service: {{service.name}}'],
			processedVariables,
		});

		expect(fullTexts).toStrictEqual(['Service: checkout-service']);
	});

	it('leaves the template untouched when neither the bare nor prefixed key exists', () => {
		const processedVariables = { _trace_id: 'abc123' };

		const { fullTexts } = resolveTexts({
			texts: ['/trace/{{unknown_field}}'],
			processedVariables,
		});

		expect(fullTexts).toStrictEqual(['/trace/{{unknown_field}}']);
	});
});
