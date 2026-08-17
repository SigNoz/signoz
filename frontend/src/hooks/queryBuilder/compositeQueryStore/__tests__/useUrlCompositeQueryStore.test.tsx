import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { serializeCompositeQueryParam } from 'lib/compositeQuery/compositeQuerySerialization';

import { useUrlCompositeQueryStore } from '../useUrlCompositeQueryStore';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

function createWrapper(
	initialUrl: string,
): ({ children }: { children: React.ReactNode }) => JSX.Element {
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return React.createElement(
			MemoryRouter,
			{ initialEntries: [initialUrl] },
			children,
		) as JSX.Element;
	};
}

function getNavigatedParams(): URLSearchParams {
	const [navigatedUrl] = mockSafeNavigate.mock.calls[0];
	return new URLSearchParams(navigatedUrl.split('?')[1]);
}

describe('useUrlCompositeQueryStore', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
	});

	it('reads the committed query and panelType from the URL', () => {
		const initialParams = new URLSearchParams();
		initialParams.set(
			QueryParams.compositeQuery,
			serializeCompositeQueryParam(initialQueriesMap.logs),
		);
		initialParams.set(QueryParams.panelTypes, PANEL_TYPES.TIME_SERIES);

		const { result } = renderHook(() => useUrlCompositeQueryStore(), {
			wrapper: createWrapper(`/logs-explorer?${initialParams.toString()}`),
		});

		expect(result.current.mode).toBe('url');
		expect(result.current.query?.id).toBe(initialQueriesMap.logs.id);
		expect(result.current.panelType).toBe(PANEL_TYPES.TIME_SERIES);
	});

	it('returns null query and panelType when the params are absent', () => {
		const { result } = renderHook(() => useUrlCompositeQueryStore(), {
			wrapper: createWrapper('/logs-explorer'),
		});

		expect(result.current.query).toBeNull();
		expect(result.current.panelType).toBeNull();
	});

	it('commits the query to the URL, resets pagination and drops activeLogId', () => {
		const initialParams = new URLSearchParams();
		initialParams.set(
			QueryParams.pagination,
			JSON.stringify({ limit: 25, offset: 50 }),
		);
		initialParams.set(QueryParams.activeLogId, 'some-log-id');

		const { result } = renderHook(() => useUrlCompositeQueryStore(), {
			wrapper: createWrapper(`/logs-explorer?${initialParams.toString()}`),
		});

		act(() => {
			result.current.commit(initialQueriesMap.logs);
		});

		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
		const [navigatedUrl, navigateOptions] = mockSafeNavigate.mock.calls[0];
		expect(navigatedUrl.startsWith('/logs-explorer?')).toBe(true);
		expect(navigateOptions).toStrictEqual({ newTab: undefined });

		const params = getNavigatedParams();
		expect(params.get(QueryParams.compositeQuery)).toBe(
			serializeCompositeQueryParam(initialQueriesMap.logs),
		);
		expect(
			JSON.parse(params.get(QueryParams.pagination) as string),
		).toStrictEqual({ limit: 25, offset: 0 });
		expect(params.get(QueryParams.activeLogId)).toBeNull();
	});

	it('honors redirectingUrl, stringified searchParams and newTab', () => {
		const { result } = renderHook(() => useUrlCompositeQueryStore(), {
			wrapper: createWrapper('/logs-explorer'),
		});

		act(() => {
			result.current.commit(initialQueriesMap.logs, {
				searchParams: { [QueryParams.panelTypes]: PANEL_TYPES.TIME_SERIES },
				redirectingUrl: ROUTES.TRACES_EXPLORER,
				newTab: true,
			});
		});

		const [navigatedUrl, navigateOptions] = mockSafeNavigate.mock.calls[0];
		expect(navigatedUrl.startsWith(`${ROUTES.TRACES_EXPLORER}?`)).toBe(true);
		expect(navigateOptions).toStrictEqual({ newTab: true });

		const params = getNavigatedParams();
		expect(params.get(QueryParams.panelTypes)).toBe(
			JSON.stringify(PANEL_TYPES.TIME_SERIES),
		);
	});

	it('passes searchParams through raw when shouldNotStringify is set', () => {
		const { result } = renderHook(() => useUrlCompositeQueryStore(), {
			wrapper: createWrapper('/logs-explorer'),
		});

		act(() => {
			result.current.commit(initialQueriesMap.logs, {
				searchParams: { [QueryParams.panelTypes]: PANEL_TYPES.TIME_SERIES },
				shouldNotStringify: true,
			});
		});

		const params = getNavigatedParams();
		expect(params.get(QueryParams.panelTypes)).toBe(PANEL_TYPES.TIME_SERIES);
	});
});
