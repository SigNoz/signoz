import {
	getApiMonitoringParams,
	useApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';
import * as navigation from 'lib/router/navigation';
import { mockAppLocation, mockNavigate } from 'tests/router-mocks';
import { act, renderHook } from 'tests/test-utils';

describe('useApiMonitoringParams', () => {
	it('keeps every write made before the next render', () => {
		let liveSearch = '';
		mockNavigate().mockImplementation((to) => {
			liveSearch = (typeof to === 'string' ? to : to.search) ?? '';
		});
		jest.spyOn(navigation, 'getCurrentLocation').mockImplementation(() => ({
			pathname: '/',
			search: liveSearch,
			hash: '',
			state: undefined,
		}));
		mockAppLocation();
		const { result } = renderHook(() => useApiMonitoringParams());

		act(() => {
			const [, setParams] = result.current;
			setParams({ allEndpointsFilterExpression: "service.name = 'cart'" });
			setParams({ selectedInterval: '15m' });
		});

		expect(getApiMonitoringParams(liveSearch)).toMatchObject({
			allEndpointsFilterExpression: "service.name = 'cart'",
			selectedInterval: '15m',
		});
	});
});
