/* eslint-disable sonarjs/no-identical-functions */
import { render, screen } from '@testing-library/react';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
} from 'providers/preferences/types';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import {
	PreferenceContextProvider,
	usePreferenceContext,
} from '../context/PreferenceContextProvider';

// Mock the usePreferenceSync hook
jest.mock('../sync/usePreferenceSync', () => ({
	usePreferenceSync: jest.fn().mockReturnValue({
		preferences: {
			columns: [] as BaseAutocompleteData[],
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
			<div data-testid="mode">{context.mode}</div>
			<div data-testid="dataSource">{context.dataSource}</div>
			<div data-testid="loading">{String(context.loading)}</div>
			<div data-testid="error">{String(context.error)}</div>
			<div data-testid="savedViewId">{context.savedViewId || 'no-view-id'}</div>
		</div>
	);
}

describe('PreferenceContextProvider', () => {
	it('should provide context with direct mode when no viewKey is present', () => {
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

		expect(screen.getByTestId('mode')).toHaveTextContent(PreferenceMode.DIRECT);
		expect(screen.getByTestId('dataSource')).toHaveTextContent('logs');
		expect(screen.getByTestId('loading')).toHaveTextContent('false');
		expect(screen.getByTestId('error')).toHaveTextContent('null');
		expect(screen.getByTestId('savedViewId')).toHaveTextContent('no-view-id');
	});

	it('should provide context with savedView mode when viewKey is present', () => {
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

		expect(screen.getByTestId('mode')).toHaveTextContent('savedView');
		expect(screen.getByTestId('dataSource')).toHaveTextContent('logs');
		expect(screen.getByTestId('savedViewId')).toHaveTextContent('test-view-id');
	});

	it('should set traces dataSource when pathname includes traces', () => {
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

		expect(screen.getByTestId('dataSource')).toHaveTextContent('traces');
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

		expect(screen.getByTestId('mode')).toHaveTextContent(PreferenceMode.DIRECT);
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
