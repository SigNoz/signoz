/* eslint-disable sonarjs/no-duplicate-string */
import { LocationDescriptorObject } from 'history';

import history from '../history';

jest.mock('history', () => {
	const actualHistory = jest.requireActual('history');
	const mockPush = jest.fn();
	const mockReplace = jest.fn();
	const mockGo = jest.fn();
	const mockGoBack = jest.fn();
	const mockGoForward = jest.fn();
	const mockBlock = jest.fn(() => jest.fn());
	const mockListen = jest.fn(() => jest.fn());
	const mockCreateHref = jest.fn((location) => {
		if (typeof location === 'string') return location;
		return actualHistory.createPath(location);
	});

	const baseHistory = {
		length: 2,
		action: 'PUSH' as const,
		location: {
			pathname: '/current-path',
			search: '?existing=param',
			hash: '#section',
			state: { existing: 'state' },
			key: 'test-key',
		},
		push: mockPush,
		replace: mockReplace,
		go: mockGo,
		goBack: mockGoBack,
		goForward: mockGoForward,
		block: mockBlock,
		listen: mockListen,
		createHref: mockCreateHref,
	};

	return {
		...actualHistory,
		createBrowserHistory: jest.fn(() => baseHistory),
	};
});

interface TestUser {
	id: number;
	name: string;
	email: string;
}

interface TestState {
	from?: string;
	user?: TestUser;
	timestamp?: number;
}

describe('Enhanced History Methods', () => {
	let mockWindowOpen: jest.SpyInstance;
	let originalPush: jest.MockedFunction<typeof history.push>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWindowOpen = jest.spyOn(window, 'open').mockImplementation(() => null);

		originalPush = history.originalPush as jest.MockedFunction<
			typeof history.push
		>;
	});

	afterEach(() => {
		mockWindowOpen.mockRestore();
	});

	describe('history.push() - String Path Navigation', () => {
		it('should handle simple string path navigation', () => {
			history.push('/dashboard');

			expect(originalPush).toHaveBeenCalledTimes(1);
			expect(originalPush).toHaveBeenCalledWith('/dashboard', undefined);
			expect(mockWindowOpen).not.toHaveBeenCalled();
		});

		it('should handle string path with state', () => {
			const testState: TestState = { from: 'home', timestamp: Date.now() };

			history.push('/dashboard', testState);

			expect(originalPush).toHaveBeenCalledWith('/dashboard', testState);
			expect(mockWindowOpen).not.toHaveBeenCalled();
		});

		it('should handle string path with query parameters', () => {
			history.push('/logs?filter=error&timeRange=24h');

			expect(originalPush).toHaveBeenCalledWith(
				'/logs?filter=error&timeRange=24h',
				undefined,
			);
		});

		it('should handle string path with hash', () => {
			history.push('/docs#installation');

			expect(originalPush).toHaveBeenCalledWith('/docs#installation', undefined);
		});

		it('should handle complex URL with all components', () => {
			const complexUrl = '/api/traces?service=backend&status=error#span-details';
			const state: TestState = {
				user: { id: 1, name: 'John', email: 'john@test.com' },
			};

			history.push(complexUrl, state);

			expect(originalPush).toHaveBeenCalledWith(complexUrl, state);
		});
	});

	describe('history.push() - Location Object Navigation', () => {
		it('should handle location object with only pathname', () => {
			const location: LocationDescriptorObject = {
				pathname: '/metrics',
			};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
			expect(mockWindowOpen).not.toHaveBeenCalled();
		});

		it('should handle location object with pathname and search', () => {
			const location: LocationDescriptorObject = {
				pathname: '/logs',
				search: '?filter=error&severity=high',
			};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
		});

		it('should handle location object with all properties', () => {
			const location: LocationDescriptorObject<TestState> = {
				pathname: '/traces',
				search: '?service=api-server&duration=slow',
				hash: '#span-123',
				state: { from: 'dashboard', timestamp: Date.now() },
				key: 'unique-key',
			};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
		});

		it('should handle location object with state passed separately', () => {
			const location: LocationDescriptorObject = {
				pathname: '/alerts',
				search: '?type=critical',
			};
			const separateState: TestState = { from: 'monitoring' };

			history.push(location, separateState);

			expect(originalPush).toHaveBeenCalledWith(location, separateState);
		});

		it('should handle empty location object', () => {
			const location: LocationDescriptorObject = {};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
		});

		it('should preserve current pathname when updating search', () => {
			const location: LocationDescriptorObject = {
				pathname: history.location.pathname,
				search: '?newParam=value',
			};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
			expect(originalPush.mock.calls[0][0]).toHaveProperty(
				'pathname',
				'/current-path',
			);
		});
	});

	describe('history.push() - Event Handling (Cmd/Ctrl+Click)', () => {
		describe('MouseEvent handling', () => {
			it('should open in new tab when metaKey is pressed with string path', () => {
				const event = new MouseEvent('click', { metaKey: true });

				history.push('/dashboard', event);

				expect(mockWindowOpen).toHaveBeenCalledWith('/dashboard', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should open in new tab when ctrlKey is pressed with string path', () => {
				const event = new MouseEvent('click', { ctrlKey: true });

				history.push('/metrics', event);

				expect(mockWindowOpen).toHaveBeenCalledWith('/metrics', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should open in new tab when both metaKey and ctrlKey are pressed', () => {
				const event = new MouseEvent('click', { metaKey: true, ctrlKey: true });

				history.push('/logs', event);

				expect(mockWindowOpen).toHaveBeenCalledWith('/logs', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should handle normal click without meta/ctrl keys', () => {
				const event = new MouseEvent('click', { metaKey: false, ctrlKey: false });
				const state: TestState = { from: 'nav' };

				history.push('/alerts', event, state);

				expect(mockWindowOpen).not.toHaveBeenCalled();
				expect(originalPush).toHaveBeenCalledWith('/alerts', state);
			});
		});

		describe('KeyboardEvent handling', () => {
			it('should open in new tab when metaKey is pressed with keyboard event', () => {
				const event = new KeyboardEvent('keydown', { metaKey: true });

				history.push('/traces', event);

				expect(mockWindowOpen).toHaveBeenCalledWith('/traces', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should open in new tab when ctrlKey is pressed with keyboard event', () => {
				const event = new KeyboardEvent('keydown', { ctrlKey: true });

				history.push('/pipelines', event);

				expect(mockWindowOpen).toHaveBeenCalledWith('/pipelines', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});
		});

		describe('React SyntheticEvent handling', () => {
			it('should handle React MouseEvent with metaKey', () => {
				const nativeEvent = new MouseEvent('click', { metaKey: true });
				const reactEvent = {
					nativeEvent,
					metaKey: true,
					ctrlKey: false,
				} as React.MouseEvent;

				history.push('/dashboard', reactEvent);

				expect(mockWindowOpen).toHaveBeenCalledWith('/dashboard', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should handle React MouseEvent with ctrlKey', () => {
				const nativeEvent = new MouseEvent('click', { ctrlKey: true });
				const reactEvent = {
					nativeEvent,
					metaKey: false,
					ctrlKey: true,
				} as React.MouseEvent;

				history.push('/logs', reactEvent);

				expect(mockWindowOpen).toHaveBeenCalledWith('/logs', '_blank');
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should handle React MouseEvent without modifier keys', () => {
				const nativeEvent = new MouseEvent('click');
				const reactEvent = {
					nativeEvent,
					metaKey: false,
					ctrlKey: false,
				} as React.MouseEvent;

				history.push('/metrics', reactEvent);

				expect(mockWindowOpen).not.toHaveBeenCalled();
				expect(originalPush).toHaveBeenCalledWith('/metrics', undefined);
			});
		});

		describe('Location Object with Event handling', () => {
			it('should open location object URL in new tab with metaKey', () => {
				const location: LocationDescriptorObject = {
					pathname: '/traces',
					search: '?service=backend',
					hash: '#span-details',
				};
				const event = new MouseEvent('click', { metaKey: true });

				history.push(location, event);

				expect(mockWindowOpen).toHaveBeenCalledWith(
					'/traces?service=backend#span-details',
					'_blank',
				);
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should open location object URL in new tab with ctrlKey', () => {
				const location: LocationDescriptorObject = {
					pathname: '/alerts',
					search: '?status=firing',
				};
				const event = new MouseEvent('click', { ctrlKey: true });

				history.push(location, event);

				expect(mockWindowOpen).toHaveBeenCalledWith(
					'/alerts?status=firing',
					'_blank',
				);
				expect(originalPush).not.toHaveBeenCalled();
			});

			it('should handle location object with normal navigation', () => {
				const location: LocationDescriptorObject = {
					pathname: '/dashboard',
					search: '?tab=overview',
				};
				const event = new MouseEvent('click', { metaKey: false, ctrlKey: false });
				const state: TestState = { from: 'home' };

				history.push(location, event, state);

				expect(mockWindowOpen).not.toHaveBeenCalled();
				expect(originalPush).toHaveBeenCalledWith(location, state);
			});

			it('should handle complex location object with all properties in new tab', () => {
				const location: LocationDescriptorObject<TestState> = {
					pathname: '/api/v1/traces',
					search: '?limit=100&offset=0&service=auth',
					hash: '#result-section',
					state: { from: 'explorer' }, // State is ignored in new tab
				};
				const event = new MouseEvent('click', { metaKey: true });

				history.push(location, event);

				expect(mockWindowOpen).toHaveBeenCalledWith(
					'/api/v1/traces?limit=100&offset=0&service=auth#result-section',
					'_blank',
				);
			});
		});
	});

	describe('history.push() - Edge Cases and Error Scenarios', () => {
		it('should handle undefined as second parameter', () => {
			history.push('/dashboard', undefined);

			expect(originalPush).toHaveBeenCalledWith('/dashboard', undefined);
		});

		it('should handle null as second parameter', () => {
			history.push('/logs', null);

			expect(originalPush).toHaveBeenCalledWith('/logs', null);
		});

		it('should handle empty string path', () => {
			history.push('');

			expect(originalPush).toHaveBeenCalledWith('', undefined);
		});

		it('should handle root path', () => {
			history.push('/');

			expect(originalPush).toHaveBeenCalledWith('/', undefined);
		});

		it('should handle relative paths', () => {
			history.push('../parent');

			expect(originalPush).toHaveBeenCalledWith('../parent', undefined);
		});

		it('should handle special characters in path', () => {
			const specialPath = '/path/with spaces/and#special?chars=@$%';

			history.push(specialPath);

			expect(originalPush).toHaveBeenCalledWith(specialPath, undefined);
		});

		it('should handle location object with undefined values', () => {
			const location: LocationDescriptorObject = {
				pathname: undefined,
				search: undefined,
				hash: undefined,
				state: undefined,
			};

			history.push(location);

			expect(originalPush).toHaveBeenCalledWith(location, undefined);
		});

		it('should handle very long URLs', () => {
			const longParam = 'x'.repeat(1000);
			const longUrl = `/path?param=${longParam}`;

			history.push(longUrl);

			expect(originalPush).toHaveBeenCalledWith(longUrl, undefined);
		});

		it('should handle object that looks like an event but isnt', () => {
			const fakeEvent = {
				metaKey: 'not-a-boolean', // Invalid type but still truthy values
				ctrlKey: 'not-a-boolean',
			};

			history.push('/dashboard', fakeEvent as any);

			// The implementation checks if metaKey/ctrlKey exist and are truthy values
			// Since these are truthy strings, it will be treated as an event
			expect(mockWindowOpen).toHaveBeenCalledWith('/dashboard', '_blank');
			expect(originalPush).not.toHaveBeenCalled();
		});

		it('should handle event-like object with falsy values', () => {
			const fakeEventFalsy = {
				metaKey: false,
				ctrlKey: false,
			};

			history.push('/dashboard', fakeEventFalsy as any);

			// The object is detected as an event (has metaKey/ctrlKey properties)
			// but since both are false, it doesn't open in new tab
			// When treated as event, third param (state) is undefined
			expect(mockWindowOpen).not.toHaveBeenCalled();
			expect(originalPush).toHaveBeenCalledWith('/dashboard', undefined);
		});

		it('should handle partial event-like objects', () => {
			const partialEvent = { metaKey: true }; // Has metaKey but not instanceof MouseEvent

			history.push('/logs', partialEvent as any);

			expect(mockWindowOpen).toHaveBeenCalledWith('/logs', '_blank');
			expect(originalPush).not.toHaveBeenCalled();
		});

		it('should handle object without event properties as state', () => {
			const regularObject = {
				someData: 'value',
				anotherProp: 123,
				// No metaKey or ctrlKey properties
			};

			history.push('/page', regularObject);

			// Object without metaKey/ctrlKey is treated as state, not event
			expect(mockWindowOpen).not.toHaveBeenCalled();
			expect(originalPush).toHaveBeenCalledWith('/page', regularObject);
		});
	});

	describe('history.push() - State Handling', () => {
		it('should pass state with string path', () => {
			const complexState: TestState = {
				from: 'dashboard',
				user: { id: 123, name: 'Test User', email: 'test@example.com' },
				timestamp: Date.now(),
			};

			history.push('/profile', complexState);

			expect(originalPush).toHaveBeenCalledWith('/profile', complexState);
		});

		it('should handle state with location object', () => {
			const location: LocationDescriptorObject<TestState> = {
				pathname: '/settings',
				state: { from: 'profile' },
			};
			const additionalState: TestState = { timestamp: Date.now() };

			history.push(location, additionalState);

			expect(originalPush).toHaveBeenCalledWith(location, additionalState);
		});

		it('should handle state with event and string path', () => {
			const event = new MouseEvent('click', { metaKey: false });
			const state: TestState = { from: 'nav' };

			history.push('/dashboard', event, state);

			expect(originalPush).toHaveBeenCalledWith('/dashboard', state);
		});

		it('should handle state with event and location object', () => {
			const location: LocationDescriptorObject = {
				pathname: '/logs',
			};
			const event = new MouseEvent('click', { metaKey: false });
			const state: TestState = { from: 'sidebar' };

			history.push(location, event, state);

			expect(originalPush).toHaveBeenCalledWith(location, state);
		});
	});

	describe('Other History Methods', () => {
		it('should have working replace method', () => {
			// replace should exist and be callable
			expect(history.replace).toBeDefined();
			expect(typeof history.replace).toBe('function');

			history.replace('/new-path');

			const mockReplace = (history as any).replace as jest.MockedFunction<
				typeof history.replace
			>;
			expect(mockReplace).toHaveBeenCalledWith('/new-path');
		});

		it('should have working go method', () => {
			expect(history.go).toBeDefined();
			expect(typeof history.go).toBe('function');

			history.go(-2);

			const mockGo = (history as any).go as jest.MockedFunction<typeof history.go>;
			expect(mockGo).toHaveBeenCalledWith(-2);
		});

		it('should have working goBack method', () => {
			expect(history.goBack).toBeDefined();
			expect(typeof history.goBack).toBe('function');

			history.goBack();

			const mockGoBack = (history as any).goBack as jest.MockedFunction<
				typeof history.goBack
			>;
			expect(mockGoBack).toHaveBeenCalled();
		});

		it('should have working goForward method', () => {
			expect(history.goForward).toBeDefined();
			expect(typeof history.goForward).toBe('function');

			history.goForward();

			const mockGoForward = (history as any).goForward as jest.MockedFunction<
				typeof history.goForward
			>;
			expect(mockGoForward).toHaveBeenCalled();
		});

		it('should have working block method', () => {
			expect(history.block).toBeDefined();
			expect(typeof history.block).toBe('function');

			const unblock = history.block('Are you sure?');

			expect(typeof unblock).toBe('function');
			const mockBlock = (history as any).block as jest.MockedFunction<
				typeof history.block
			>;
			expect(mockBlock).toHaveBeenCalledWith('Are you sure?');
		});

		it('should have working listen method', () => {
			expect(history.listen).toBeDefined();
			expect(typeof history.listen).toBe('function');

			const listener = jest.fn();

			const unlisten = history.listen(listener);

			expect(typeof unlisten).toBe('function');
			const mockListen = (history as any).listen as jest.MockedFunction<
				typeof history.listen
			>;
			expect(mockListen).toHaveBeenCalledWith(listener);
		});

		it('should have working createHref method', () => {
			expect(history.createHref).toBeDefined();
			expect(typeof history.createHref).toBe('function');

			const location: LocationDescriptorObject = {
				pathname: '/test',
				search: '?query=value',
			};

			const href = history.createHref(location);

			expect(href).toBe('/test?query=value');
		});

		it('should have accessible location property', () => {
			expect(history.location).toBeDefined();
			expect(history.location.pathname).toBe('/current-path');
			expect(history.location.search).toBe('?existing=param');
			expect(history.location.hash).toBe('#section');
			expect(history.location.state).toEqual({ existing: 'state' });
		});

		it('should have accessible length property', () => {
			expect(history.length).toBeDefined();
			expect(history.length).toBe(2);
		});

		it('should have accessible action property', () => {
			expect(history.action).toBeDefined();
			expect(history.action).toBe('PUSH');
		});
	});
});
