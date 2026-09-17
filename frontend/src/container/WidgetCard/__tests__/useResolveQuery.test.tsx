import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useUpdatedQuery from 'container/WidgetCard/hooks/useResolveQuery';

const mockGetSubstituteVars = vi.fn();
const mockDynamicVariables: unknown[] = [];

vi.mock('api/dashboard/substitute_vars', () => ({
	getSubstituteVars: (...args: unknown[]): unknown =>
		mockGetSubstituteVars(...args),
}));

vi.mock('api/v5/v5', () => ({
	prepareQueryRangePayloadV5: (): { queryPayload: unknown } => ({
		queryPayload: { start: 0, end: 1 },
	}),
}));

vi.mock('lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi', () => ({
	mapQueryDataFromApi: (): Query => ({ resolved: true }) as unknown as Query,
}));

vi.mock('hooks/dashboard/useDynamicVariableSuggestions', () => ({
	useDynamicVariableSuggestions: (): unknown[] => mockDynamicVariables,
}));

vi.mock('react-redux', () => ({
	...vi.importActual('react-redux'),
	useSelector: (): unknown => ({
		selectedTime: 'GLOBAL_TIME',
	}),
}));

const QUERY = { builder: { queryData: [] } } as unknown as Query;

const WIDGET_CONFIG = {
	query: QUERY,
	panelTypes: PANEL_TYPES.TIME_SERIES,
	timePreferance: 'GLOBAL_TIME' as const,
};

describe('useResolveQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDynamicVariables.length = 0;
	});

	it('skips the substitute_vars round-trip when there are no variables', async () => {
		const { result } = renderHook(() => useUpdatedQuery(), {
			wrapper: MockQueryClientProvider,
		});

		const resolved = await result.current.getUpdatedQuery({
			widgetConfig: WIDGET_CONFIG,
		});

		expect(mockGetSubstituteVars).not.toHaveBeenCalled();
		expect(resolved).toBe(QUERY);
	});

	it('resolves through substitute_vars when the dashboard has dynamic variables', async () => {
		mockGetSubstituteVars.mockResolvedValue({
			httpStatusCode: 200,
			data: { compositeQuery: {} },
		});
		mockDynamicVariables.push({ name: 'env', attribute: 'deployment.env' });

		const { result } = renderHook(() => useUpdatedQuery(), {
			wrapper: MockQueryClientProvider,
		});

		const resolved = await result.current.getUpdatedQuery({
			widgetConfig: WIDGET_CONFIG,
		});

		expect(mockGetSubstituteVars).toHaveBeenCalledTimes(1);
		expect(resolved).toStrictEqual({ resolved: true });
	});
});
