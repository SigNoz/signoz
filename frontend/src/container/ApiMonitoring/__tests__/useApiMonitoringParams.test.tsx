import { ALL_ENDPOINTS_EXPRESSION_KEY } from 'container/ApiMonitoring/filterParamKeys';
import {
	getApiMonitoringParams,
	useApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';
import { mockAppLocation, mockNavigate } from 'tests/router-mocks';
import { act, renderHook } from 'tests/test-utils';

// The stub writes to the browser URL, which the hook reads back; the router's
// own location (`useAppLocation`) stays at its first value.
function renderParamsHook(): ReturnType<
	typeof renderHook<ReturnType<typeof useApiMonitoringParams>, unknown>
> {
	mockNavigate().mockImplementation((to) => {
		const url = typeof to === 'string' ? to : `/${to.search ?? ''}`;
		window.history.pushState(null, '', url);
	});
	mockAppLocation();
	return renderHook(() => useApiMonitoringParams());
}

describe('useApiMonitoringParams', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '/');
	});

	it('keeps every write made before the next render', () => {
		const { result } = renderParamsHook();

		act(() => {
			const [, setParams] = result.current;
			setParams({ selectedView: 'endpoint_stats' });
			setParams({ selectedInterval: '15m' });
		});

		expect(getApiMonitoringParams(window.location.search)).toMatchObject({
			selectedView: 'endpoint_stats',
			selectedInterval: '15m',
		});
	});

	it('keeps a drawer filter written outside the router', () => {
		window.history.replaceState(
			null,
			'',
			`/?${ALL_ENDPOINTS_EXPRESSION_KEY}=${encodeURIComponent(
				"service.name = 'cart'",
			)}`,
		);
		const { result } = renderParamsHook();

		act(() => {
			const [, setParams] = result.current;
			setParams({ selectedView: 'endpoint_stats' });
		});

		const search = new URLSearchParams(window.location.search);
		expect(search.get(ALL_ENDPOINTS_EXPRESSION_KEY)).toBe(
			"service.name = 'cart'",
		);
		expect(getApiMonitoringParams(window.location.search).selectedView).toBe(
			'endpoint_stats',
		);
	});
});
