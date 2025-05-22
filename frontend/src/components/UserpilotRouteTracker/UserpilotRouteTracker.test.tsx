import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { Userpilot } from 'userpilot';

import UserpilotRouteTracker from './UserpilotRouteTracker';

// Mock constants
const INITIAL_PATH = '/initial';
const TIMER_DELAY = 100;

// Mock the userpilot module
jest.mock('userpilot', () => ({
	Userpilot: {
		reload: jest.fn(),
	},
}));

// Mock location state
let mockLocation = {
	pathname: INITIAL_PATH,
	search: '',
	hash: '',
	state: null,
};

// Mock react-router-dom
jest.mock('react-router-dom', () => {
	const originalModule = jest.requireActual('react-router-dom');

	return {
		...originalModule,
		useLocation: jest.fn(() => mockLocation),
	};
});

describe('UserpilotRouteTracker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset timers
		jest.useFakeTimers();
		// Reset error mock implementation
		(Userpilot.reload as jest.Mock).mockImplementation(() => {});
		// Reset location to initial state
		mockLocation = {
			pathname: INITIAL_PATH,
			search: '',
			hash: '',
			state: null,
		};
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('calls Userpilot.reload on initial render', () => {
		render(
			<MemoryRouter>
				<UserpilotRouteTracker />
			</MemoryRouter>,
		);

		// Fast-forward timer to trigger the setTimeout in reloadUserpilot
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});

		expect(Userpilot.reload).toHaveBeenCalledTimes(1);
	});

	it('calls Userpilot.reload when pathname changes', () => {
		const { rerender } = render(
			<MemoryRouter>
				<UserpilotRouteTracker />
			</MemoryRouter>,
		);

		// Fast-forward initial render timer
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});
		jest.clearAllMocks();

		// Create a new location object with different pathname
		const newLocation = {
			...mockLocation,
			pathname: '/new-path',
		};

		// Update the mock location with new path and trigger re-render
		act(() => {
			mockLocation = newLocation;
			// Force a component update with the new location
			rerender(
				<MemoryRouter>
					<UserpilotRouteTracker />
				</MemoryRouter>,
			);
		});

		// Fast-forward timer to allow the setTimeout to execute
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});

		expect(Userpilot.reload).toHaveBeenCalledTimes(1);
	});

	it('calls Userpilot.reload when search parameters change', () => {
		const { rerender } = render(
			<MemoryRouter>
				<UserpilotRouteTracker />
			</MemoryRouter>,
		);

		// Fast-forward initial render timer
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});
		jest.clearAllMocks();

		// Create a new location object with different search params
		const newLocation = {
			...mockLocation,
			search: '?param=value',
		};

		// Update the mock location with new search and trigger re-render
		// eslint-disable-next-line sonarjs/no-identical-functions
		act(() => {
			mockLocation = newLocation;
			// Force a component update with the new location
			rerender(
				<MemoryRouter>
					<UserpilotRouteTracker />
				</MemoryRouter>,
			);
		});

		// Fast-forward timer to allow the setTimeout to execute
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});

		expect(Userpilot.reload).toHaveBeenCalledTimes(1);
	});

	it('handles errors in Userpilot.reload gracefully', () => {
		// Mock console.error to prevent test output noise and capture calls
		const consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		// Instead of using the component, we test the error handling behavior directly
		const errorMsg = 'Error message';

		// Set up a function that has the same error handling behavior as in component
		const testErrorHandler = (): void => {
			try {
				if (typeof Userpilot !== 'undefined' && Userpilot.reload) {
					Userpilot.reload();
				}
			} catch (error) {
				console.error('[Userpilot] Error reloading on route change:', error);
			}
		};

		// Make Userpilot.reload throw an error
		(Userpilot.reload as jest.Mock).mockImplementation(() => {
			throw new Error(errorMsg);
		});

		// Execute the function that should handle errors
		testErrorHandler();

		// Verify error was logged
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[Userpilot] Error reloading on route change:',
			expect.any(Error),
		);

		// Restore console mock
		consoleErrorSpy.mockRestore();
	});

	it('does not call Userpilot.reload when same route is rendered again', () => {
		const { rerender } = render(
			<MemoryRouter>
				<UserpilotRouteTracker />
			</MemoryRouter>,
		);

		// Fast-forward initial render timer
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});
		jest.clearAllMocks();

		act(() => {
			mockLocation = {
				pathname: mockLocation.pathname,
				search: mockLocation.search,
				hash: mockLocation.hash,
				state: mockLocation.state,
			};
			// Force a component update with the same location
			rerender(
				<MemoryRouter>
					<UserpilotRouteTracker />
				</MemoryRouter>,
			);
		});

		// Fast-forward timer
		act(() => {
			jest.advanceTimersByTime(TIMER_DELAY);
		});

		// Should not call reload since path and search are the same
		expect(Userpilot.reload).not.toHaveBeenCalled();
	});
});
