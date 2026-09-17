import type { Mock, MockedFunction } from 'vitest';
import { useMutation } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { Widgets } from 'types/api/widgets/widget';
import { EQueryType } from 'types/common/dashboard';

import useCreateAlerts from '../useCreateAlerts';

vi.mock('react-query', () => ({
	useMutation: vi.fn(),
}));

vi.mock('react-redux', () => ({
	useSelector: vi.fn(),
}));

vi.mock('api/dashboard/substitute_vars', () => ({
	getSubstituteVars: vi.fn(),
}));

vi.mock('api/v5/v5', () => ({
	prepareQueryRangePayloadV5: vi.fn().mockReturnValue({ queryPayload: {} }),
}));

vi.mock('lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi', () => ({
	mapQueryDataFromApi: vi.fn(),
}));

vi.mock('hooks/dashboard/useDynamicVariableSuggestions', () => ({
	useDynamicVariableSuggestions: (): unknown[] => [],
}));

vi.mock('hooks/useNotifications', () => ({
	useNotifications: (): unknown => ({
		notifications: { error: vi.fn() },
	}),
}));

vi.mock('utils/getGraphType', () => ({
	getGraphType: vi.fn().mockReturnValue('time_series'),
}));

const mockMapQueryDataFromApi = mapQueryDataFromApi as MockedFunction<
	typeof mapQueryDataFromApi
>;
const mockUseMutation = useMutation as MockedFunction<typeof useMutation>;
const mockUseSelector = useSelector as MockedFunction<typeof useSelector>;

const buildWidget = (queryType: EQueryType | undefined): Widgets =>
	({
		id: 'widget-1',
		panelTypes: 'graph',
		timePreferance: 'GLOBAL_TIME',
		yAxisUnit: '',
		query: {
			queryType,
			builder: { queryData: [], queryFormulas: [] },
			clickhouse_sql: [],
			promql: [],
			id: 'q-1',
		},
	}) as unknown as Widgets;

const getCompositeQueryFromLastOpen = (): Record<string, unknown> => {
	const [url] = (window.open as Mock).mock.calls[0];
	const query = new URLSearchParams((url as string).split('?')[1]);
	const raw = query.get(QueryParams.compositeQuery);
	if (!raw) {
		throw new Error('compositeQuery not found in URL');
	}
	return JSON.parse(decodeURIComponent(raw));
};

describe('useCreateAlerts', () => {
	let capturedOnSuccess:
		| ((data: { data: { compositeQuery: unknown } }) => void)
		| null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedOnSuccess = null;

		mockUseSelector.mockReturnValue({ selectedTime: '1h' });

		mockUseMutation.mockReturnValue({
			mutate: vi.fn((_payload, opts) => {
				capturedOnSuccess = opts?.onSuccess ?? null;
			}),
		} as unknown as ReturnType<typeof useMutation>);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).open = vi.fn();
	});

	it('preserves widget queryType when the API response maps to a different queryType', () => {
		mockMapQueryDataFromApi.mockReturnValue({
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [], queryFormulas: [] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const widget = buildWidget(EQueryType.CLICKHOUSE);
		const { result } = renderHook(() => useCreateAlerts(widget));

		act(() => {
			result.current();
		});

		expect(capturedOnSuccess).not.toBeNull();

		act(() => {
			capturedOnSuccess?.({ data: { compositeQuery: {} } });
		});

		const composite = getCompositeQueryFromLastOpen();
		expect(composite.queryType).toBe(EQueryType.CLICKHOUSE);
	});

	it('preserves promql queryType through the alert navigation URL', () => {
		mockMapQueryDataFromApi.mockReturnValue({
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [], queryFormulas: [] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const widget = buildWidget(EQueryType.PROM);
		const { result } = renderHook(() => useCreateAlerts(widget));

		act(() => {
			result.current();
		});
		act(() => {
			capturedOnSuccess?.({ data: { compositeQuery: {} } });
		});

		const composite = getCompositeQueryFromLastOpen();
		expect(composite.queryType).toBe(EQueryType.PROM);
	});

	it('falls back to the mapped queryType when widget has no queryType', () => {
		mockMapQueryDataFromApi.mockReturnValue({
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [], queryFormulas: [] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const widget = buildWidget(undefined);
		const { result } = renderHook(() => useCreateAlerts(widget));

		act(() => {
			result.current();
		});
		act(() => {
			capturedOnSuccess?.({ data: { compositeQuery: {} } });
		});

		const composite = getCompositeQueryFromLastOpen();
		// No override, so the mapped value wins.
		expect(composite.queryType).toBe(EQueryType.QUERY_BUILDER);
	});

	it('does nothing when widget is undefined', () => {
		const { result } = renderHook(() => useCreateAlerts(undefined));

		act(() => {
			result.current();
		});

		const mutateCalls = (
			mockUseMutation.mock.results[0].value as ReturnType<typeof useMutation>
		).mutate as Mock;
		expect(mutateCalls).not.toHaveBeenCalled();
	});
});
