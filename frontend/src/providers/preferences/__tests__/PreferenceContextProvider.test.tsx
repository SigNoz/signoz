/* eslint-disable sonarjs/no-identical-functions */
import { render, screen } from '@testing-library/react';
import { TelemetryFieldKey } from 'api/v5/v5';
import { FormattingOptions, Preferences } from 'providers/preferences/types';
import { MemoryRouter, Route, Switch } from 'react-router-dom';

import {
	PreferenceContextProvider,
	usePreferenceContext,
} from '../context/PreferenceContextProvider';

// Mock the usePreferenceSync hook
jest.mock('../sync/usePreferenceSync', () => ({
	usePreferenceSync: jest.fn().mockReturnValue({
		preferences: {
			columns: [] as TelemetryFieldKey[],
			formatting: {
				maxLines: 2,
				format: 'table',
				fontSize: 'small',
				version: 1,
			} as FormattingOptions,
		} as Preferences,
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
	}),
}));

// Test component that consumes the context
function TestConsumer(): JSX.Element {
	const context = usePreferenceContext();
	return (
		<div>
			<div data-testid="loading">{String(context.logs.loading)}</div>
			<div data-testid="error">{String(context.logs.error)}</div>
		</div>
	);
}

describe('PreferenceContextProvider', () => {
	it('should provide context with default values when no viewKey is present', () => {
		render(
			<MemoryRouter initialEntries={['/logs']}>
				<Switch>
					<Route
						path="/logs"
						component={(): JSX.Element => (
							<PreferenceContextProvider>
								<TestConsumer />
							</PreferenceContextProvider>
						)}
					/>
				</Switch>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('loading')).toHaveTextContent('false');
		expect(screen.getByTestId('error')).toHaveTextContent('null');
	});

	it('should render correctly when viewKey is present', () => {
		render(
			<MemoryRouter initialEntries={['/logs?viewKey="test-view-id"']}>
				<Switch>
					<Route
						path="/logs"
						component={(): JSX.Element => (
							<PreferenceContextProvider>
								<TestConsumer />
							</PreferenceContextProvider>
						)}
					/>
				</Switch>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('loading')).toHaveTextContent('false');
	});

	it('should render correctly for traces path as well', () => {
		render(
			<MemoryRouter initialEntries={['/traces']}>
				<Switch>
					<Route
						path="/traces"
						component={(): JSX.Element => (
							<PreferenceContextProvider>
								<TestConsumer />
							</PreferenceContextProvider>
						)}
					/>
				</Switch>
			</MemoryRouter>,
		);
		// assert provider renders without mode/savedViewId
		expect(screen.getByTestId('loading')).toBeInTheDocument();
	});

	it('should handle invalid viewKey JSON gracefully', () => {
		// Mock console.error to avoid test output clutter
		const originalConsoleError = console.error;
		console.error = jest.fn();

		render(
			<MemoryRouter initialEntries={['/logs?viewKey=invalid-json']}>
				<Switch>
					<Route
						path="/logs"
						component={(): JSX.Element => (
							<PreferenceContextProvider>
								<TestConsumer />
							</PreferenceContextProvider>
						)}
					/>
				</Switch>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('loading')).toBeInTheDocument();
		expect(console.error).toHaveBeenCalled();

		// Restore console.error
		console.error = originalConsoleError;
	});

	it('should throw error when usePreferenceContext is used outside provider', () => {
		// Suppress the error output for this test
		const originalConsoleError = console.error;
		console.error = jest.fn();

		expect(() => {
			render(<TestConsumer />);
		}).toThrow(
			'usePreferenceContext must be used within PreferenceContextProvider',
		);

		// Restore console.error
		console.error = originalConsoleError;
	});
});
