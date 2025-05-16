import { renderHook } from '@testing-library/react';

import useGetResolvedText from '../useGetResolvedText';

// Mock the useDashboard hook
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: function useDashboardMock(): any {
		return {
			selectedDashboard: null,
		};
	},
}));

describe('useGetResolvedText', () => {
	const SERVICE_VAR = 'test, app +2-|-test, app, frontend, env';
	const SEVERITY_VAR = 'DEBUG, INFO-|-DEBUG, INFO';
	const EXPECTED_FULL_TEXT =
		'Logs count in test, app, frontend, env in DEBUG, INFO';
	const TRUNCATED_SERVICE = 'test, app +2';
	const TEXT_TEMPLATE = 'Logs count in $service.name in $severity';

	const renderHookWithProps = (props: {
		text: string;
		variables?: Record<string, string | number | boolean>;
		dashboardVariables?: Record<string, any>;
		maxLength?: number;
		matcher?: string;
	}): any => renderHook(() => useGetResolvedText(props));

	it('should resolve variables with truncated and full text', () => {
		const text = TEXT_TEMPLATE;
		const variables = {
			'service.name': SERVICE_VAR,
			severity: SEVERITY_VAR,
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.truncatedText).toBe(
			`Logs count in ${TRUNCATED_SERVICE} in DEBUG, INFO`,
		);
		expect(result.current.fullText).toBe(EXPECTED_FULL_TEXT);
	});

	it('should handle text with maxLength truncation', () => {
		const text = TEXT_TEMPLATE;
		const variables = {
			'service.name': SERVICE_VAR,
			severity: SEVERITY_VAR,
		};

		const { result } = renderHookWithProps({ text, variables, maxLength: 20 });

		expect(result.current.truncatedText).toBe('Logs count in test, a...');
		expect(result.current.fullText).toBe(EXPECTED_FULL_TEXT);
	});

	it('should handle multiple occurrences of the same variable', () => {
		const text = 'Logs count in $service.name and $service.name';
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.truncatedText).toBe(
			'Logs count in test, app +2 and test, app +2',
		);
		expect(result.current.fullText).toBe(
			'Logs count in test, app, frontend, env and test, app, frontend, env',
		);
	});

	it('should handle different variable formats', () => {
		const text = 'Logs in $service.name, {{service.name}}, [[service.name]]';
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.truncatedText).toBe(
			'Logs in test, app +2, test, app +2, test, app +2',
		);
		expect(result.current.fullText).toBe(
			'Logs in test, app, frontend, env, test, app, frontend, env, test, app, frontend, env',
		);
	});

	it('should handle custom matcher', () => {
		const text = 'Logs count in #service.name in #severity';
		const variables = {
			'service.name': SERVICE_VAR,
			severity: SEVERITY_VAR,
		};

		const { result } = renderHookWithProps({ text, variables, matcher: '#' });

		expect(result.current.truncatedText).toBe(
			'Logs count in test, app +2 in DEBUG, INFO',
		);
		expect(result.current.fullText).toBe(EXPECTED_FULL_TEXT);
	});

	it('should handle non-string variable values', () => {
		const text = 'Count: $count, Active: $active';
		const variables = {
			count: 42,
			active: true,
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.fullText).toBe('Count: 42, Active: true');
		expect(result.current.truncatedText).toBe('Count: 42, Active: true');
	});

	it('should keep original text for undefined variables', () => {
		const text = 'Logs count in $service.name in $unknown';
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.truncatedText).toBe(
			'Logs count in test, app +2 in $unknown',
		);
		expect(result.current.fullText).toBe(
			'Logs count in test, app, frontend, env in $unknown',
		);
	});
});
