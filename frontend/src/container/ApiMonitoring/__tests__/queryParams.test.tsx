import {
	ApiMonitoringParams,
	DEFAULT_PARAMS,
	getApiMonitoringParams,
	setApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';

// Mock navigation module
const mockNavigate = jest.fn();
jest.mock('lib/router/navigation', () => ({
	navigate: (...args: any[]) => mockNavigate(...args),
}));

describe('API Monitoring Query Params', () => {
	describe('getApiMonitoringParams', () => {
		it('returns default params when no query param exists', () => {
			const search = '';
			expect(getApiMonitoringParams(search)).toStrictEqual(DEFAULT_PARAMS);
		});

		it('parses URL query params correctly', () => {
			const mockParams: Partial<ApiMonitoringParams> = {
				showIP: false,
				selectedDomain: 'test-domain',
				selectedView: 'test-view',
				selectedEndPointName: '/api/test',
			};

			// Create a URL search string with encoded params
			const urlParams = new URLSearchParams();
			urlParams.set(
				'apiMonitoringParams',
				encodeURIComponent(JSON.stringify(mockParams)),
			);
			const search = `?${urlParams.toString()}`;

			const result = getApiMonitoringParams(search);

			// Only check specific properties that we set, not all DEFAULT_PARAMS
			expect(result.showIP).toBe(mockParams.showIP);
			expect(result.selectedDomain).toBe(mockParams.selectedDomain);
			expect(result.selectedView).toBe(mockParams.selectedView);
			expect(result.selectedEndPointName).toBe(mockParams.selectedEndPointName);
		});

		it('returns default params when parsing fails', () => {
			const urlParams = new URLSearchParams();
			urlParams.set('apiMonitoringParams', 'invalid-json');
			const search = `?${urlParams.toString()}`;

			expect(getApiMonitoringParams(search)).toStrictEqual(DEFAULT_PARAMS);
		});
	});

	describe('setApiMonitoringParams', () => {
		beforeEach(() => {
			mockNavigate.mockClear();
		});

		it('updates URL with new params (push mode)', () => {
			const search = '';
			const newParams: Partial<ApiMonitoringParams> = {
				showIP: false,
				selectedDomain: 'updated-domain',
			};

			setApiMonitoringParams(newParams, search, false);

			expect(mockNavigate).toHaveBeenCalledWith(
				{ search: expect.stringContaining('apiMonitoringParams') },
				{ replace: false },
			);

			// Verify that the search string contains the expected encoded params
			const searchArg = mockNavigate.mock.calls[0][0].search;
			const params = new URLSearchParams(searchArg);
			const decoded = JSON.parse(
				decodeURIComponent(params.get('apiMonitoringParams') || ''),
			);

			// Test only the specific fields we set
			expect(decoded.showIP).toBe(newParams.showIP);
			expect(decoded.selectedDomain).toBe(newParams.selectedDomain);
		});

		it('updates URL with new params (replace mode)', () => {
			const search = '';
			const newParams: Partial<ApiMonitoringParams> = {
				showIP: false,
				selectedDomain: 'updated-domain',
			};

			setApiMonitoringParams(newParams, search, true);

			expect(mockNavigate).toHaveBeenCalledWith(
				{ search: expect.stringContaining('apiMonitoringParams') },
				{ replace: true },
			);
		});

		it('merges new params with existing params', () => {
			// Start with some existing params
			const existingParams: Partial<ApiMonitoringParams> = {
				showIP: true,
				selectedDomain: 'domain-1',
				selectedView: 'view-1',
			};

			const urlParams = new URLSearchParams();
			urlParams.set(
				'apiMonitoringParams',
				encodeURIComponent(JSON.stringify(existingParams)),
			);
			const search = `?${urlParams.toString()}`;

			// Add some new params
			const newParams: Partial<ApiMonitoringParams> = {
				selectedDomain: 'domain-2',
				selectedEndPointName: '/api/test',
			};

			setApiMonitoringParams(newParams, search, false);

			// Verify merged params
			const searchArg = mockNavigate.mock.calls[0][0].search;
			const params = new URLSearchParams(searchArg);
			const decoded = JSON.parse(
				decodeURIComponent(params.get('apiMonitoringParams') || ''),
			);

			// Test only the specific fields
			expect(decoded.showIP).toBe(existingParams.showIP);
			expect(decoded.selectedView).toBe(existingParams.selectedView);
			expect(decoded.selectedDomain).toBe(newParams.selectedDomain); // This should be overwritten
			expect(decoded.selectedEndPointName).toBe(newParams.selectedEndPointName);
		});
	});

	describe('useApiMonitoringParams hook without calling hook directly', () => {
		// Instead of using the hook directly, We are testing the individual functions that make up the hook
		// as the original hook contains react core hooks
		const mockUseLocationAndHistory = (initialSearch = ''): any => {
			// Create mock location object
			const location = {
				search: initialSearch,
				pathname: '/some-path',
				hash: '',
				state: null,
			};

			return { location };
		};

		it('retrieves URL params correctly from location', () => {
			const testParams: Partial<ApiMonitoringParams> = {
				showIP: false,
				selectedDomain: 'test-domain',
				selectedView: 'custom-view',
			};

			const urlParams = new URLSearchParams();
			urlParams.set(
				'apiMonitoringParams',
				encodeURIComponent(JSON.stringify(testParams)),
			);
			const search = `?${urlParams.toString()}`;

			const result = getApiMonitoringParams(search);

			// Test only specific fields
			expect(result.showIP).toBe(testParams.showIP);
			expect(result.selectedDomain).toBe(testParams.selectedDomain);
			expect(result.selectedView).toBe(testParams.selectedView);
		});

		it('updates URL correctly with new params', () => {
			const { location } = mockUseLocationAndHistory();

			const newParams: Partial<ApiMonitoringParams> = {
				selectedDomain: 'new-domain',
				showIP: false,
			};

			// Manually execute the core logic of the hook's setParams function
			setApiMonitoringParams(newParams, location.search);

			expect(mockNavigate).toHaveBeenCalledWith(
				{ search: expect.stringContaining('apiMonitoringParams') },
				{ replace: false },
			);

			const searchArg = mockNavigate.mock.calls[0][0].search;
			const params = new URLSearchParams(searchArg);
			const decoded = JSON.parse(
				decodeURIComponent(params.get('apiMonitoringParams') || ''),
			);

			// Test only specific fields
			expect(decoded.selectedDomain).toBe(newParams.selectedDomain);
			expect(decoded.showIP).toBe(newParams.showIP);
		});

		it('preserves existing params when updating', () => {
			// Create a search string with existing params
			const initialParams: Partial<ApiMonitoringParams> = {
				showIP: false,
				selectedDomain: 'initial-domain',
			};

			const urlParams = new URLSearchParams();
			urlParams.set(
				'apiMonitoringParams',
				encodeURIComponent(JSON.stringify(initialParams)),
			);
			const initialSearch = `?${urlParams.toString()}`;

			// Set up mocks
			const { location } = mockUseLocationAndHistory(initialSearch);

			// Manually execute the core logic
			setApiMonitoringParams({ selectedView: 'new-view' }, location.search);

			// Verify history was updated
			expect(mockNavigate).toHaveBeenCalled();

			// Parse the new query params from the URL
			const searchArg = mockNavigate.mock.calls[0][0].search;
			const params = new URLSearchParams(searchArg);
			const decoded = JSON.parse(
				decodeURIComponent(params.get('apiMonitoringParams') || ''),
			);

			// Test only specific fields
			expect(decoded.showIP).toBe(initialParams.showIP);
			expect(decoded.selectedDomain).toBe(initialParams.selectedDomain);
			expect(decoded.selectedView).toBe('new-view');
		});
	});
});
