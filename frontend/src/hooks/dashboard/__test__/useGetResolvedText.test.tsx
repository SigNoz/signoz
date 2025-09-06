import { renderHook } from '@testing-library/react';
import React from 'react';

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
		text: string | React.ReactNode;
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
		const text =
			'Logs in $service.name, {{service.name}}, [[service.name]] - $dyn-service.name';
		const variables = {
			'service.name': SERVICE_VAR,
			'$dyn-service.name': 'dyn-1, dyn-2',
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.truncatedText).toBe(
			'Logs in test, app +2, test, app +2, test, app +2 - dyn-1, dyn-2',
		);
		expect(result.current.fullText).toBe(
			'Logs in test, app, frontend, env, test, app, frontend, env, test, app, frontend, env - dyn-1, dyn-2',
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

	it('should handle non-string text input (ReactNode)', () => {
		const reactNodeText = <div>Test ReactNode</div>;
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({
			text: reactNodeText,
			variables,
		});

		// Should return the ReactNode unchanged
		expect(result.current.fullText).toBe(reactNodeText);
		expect(result.current.truncatedText).toBe(reactNodeText);
	});

	it('should handle number input', () => {
		const text = 123;
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({
			text,
			variables,
		});

		// Should return the number unchanged
		expect(result.current.fullText).toBe(text);
		expect(result.current.truncatedText).toBe(text);
	});

	it('should handle boolean input', () => {
		const text = true;
		const variables = {
			'service.name': SERVICE_VAR,
		};

		const { result } = renderHookWithProps({
			text,
			variables,
		});

		// Should return the boolean unchanged
		expect(result.current.fullText).toBe(text);
		expect(result.current.truncatedText).toBe(text);
	});

	it('should handle complex variable names with improved patterns', () => {
		const text = 'API: $api.v1.endpoint Config: $config.database.host';
		const variables = {
			'api.v1.endpoint': '/users',
			'config.database.host': 'localhost:5432',
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.fullText).toBe('API: /users Config: localhost:5432');
		expect(result.current.truncatedText).toBe(
			'API: /users Config: localhost:5432',
		);
	});

	it('should stop at punctuation boundaries correctly', () => {
		const text = 'Status: $service.name, Error: $error.type;';
		const variables = {
			'service.name': 'web-api',
			'error.type': 'timeout',
		};

		const { result } = renderHookWithProps({ text, variables });

		expect(result.current.fullText).toBe('Status: web-api, Error: timeout;');
		expect(result.current.truncatedText).toBe('Status: web-api, Error: timeout;');
	});
});
