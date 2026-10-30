import { type ReactNode, useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type {
	SavedListView,
	SavedListViewsApi,
} from 'components/ListViews/types';

import { useListViews } from '../useListViews';
import type { UseListViewsResult } from '../types';

interface Filter {
	query: string;
	sort: string;
}

const BUILTIN_QUERIES: Record<string, string> = { all: '', locked: 'locked' };

const builtinFilter = (id: string, current: Filter): Filter | null =>
	id in BUILTIN_QUERIES ? { ...current, query: BUILTIN_QUERIES[id] } : null;

const isEqual = (a: Filter, b: Filter): boolean =>
	a.query.trim() === b.query.trim();

const CUSTOM: SavedListView<Filter> = {
	id: 'v1',
	name: 'Prod',
	filter: { query: 'env = prod', sort: 'name' },
};

function makeApi(): jest.Mocked<SavedListViewsApi<Filter>> {
	return {
		views: [CUSTOM],
		isLoading: false,
		createView: jest.fn(async (name: string, filter: Filter) => ({
			id: 'new',
			name,
			filter,
		})),
		updateView: jest.fn(),
		deleteView: jest.fn(async (_id: string): Promise<void> => undefined),
	};
}

interface Harness extends UseListViewsResult<Filter> {
	filter: Filter;
	setFilter: (f: Filter) => void;
}

function setup(
	api: SavedListViewsApi<Filter>,
	searchParams = '',
	initial: Filter = { query: '', sort: 'updated' },
): { result: { current: Harness } } {
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			{children}
		</NuqsTestingAdapter>
	);
	return renderHook(
		(): Harness => {
			const [filter, setFilter] = useState<Filter>(initial);
			const views = useListViews<Filter>({
				filter,
				applyFilter: setFilter,
				isEqual,
				builtinFilter,
				defaultViewId: 'all',
				api,
			});
			return { ...views, filter, setFilter };
		},
		{ wrapper },
	);
}

describe('useListViews', () => {
	it('defaults to the default view and is clean', () => {
		const { result } = setup(makeApi());
		expect(result.current.activeViewId).toBe('all');
		expect(result.current.isCustomActive).toBe(false);
		expect(result.current.isModified).toBe(false);
	});

	it('selecting a builtin applies its filter, keeping the rest of the current filter', () => {
		const { result } = setup(makeApi());
		act(() => result.current.selectView('locked'));
		expect(result.current.activeViewId).toBe('locked');
		expect(result.current.filter).toStrictEqual({
			query: 'locked',
			sort: 'updated',
		});
		expect(result.current.isModified).toBe(false);
	});

	it('selecting a custom view applies its stored filter', () => {
		const { result } = setup(makeApi());
		act(() => result.current.selectView('v1'));
		expect(result.current.isCustomActive).toBe(true);
		expect(result.current.activeView).toBe(CUSTOM);
		expect(result.current.filter).toStrictEqual(CUSTOM.filter);
	});

	it('detects divergence via isEqual and resets to the canonical filter', () => {
		const { result } = setup(makeApi(), '?view=v1', CUSTOM.filter);
		act(() => result.current.setFilter({ query: 'env = prod ', sort: 'x' }));
		expect(result.current.isModified).toBe(false);
		act(() => result.current.setFilter({ query: 'env = dev', sort: 'name' }));
		expect(result.current.isModified).toBe(true);
		act(() => result.current.resetView());
		expect(result.current.filter).toStrictEqual(CUSTOM.filter);
		expect(result.current.isModified).toBe(false);
	});

	it('saveView creates the view from the current filter and selects it', async () => {
		const api = makeApi();
		const { result } = setup(api, '', { query: 'a', sort: 'name' });
		act(() => result.current.saveView('Mine'));
		expect(api.createView).toHaveBeenCalledWith('Mine', {
			query: 'a',
			sort: 'name',
		});
		await waitFor(() => expect(result.current.activeViewId).toBe('new'));
	});

	it('saveActiveView updates the active custom view with the current filter', () => {
		const api = makeApi();
		const { result } = setup(api, '?view=v1', CUSTOM.filter);
		act(() => result.current.setFilter({ query: 'env = dev', sort: 'name' }));
		act(() => result.current.saveActiveView());
		expect(api.updateView).toHaveBeenCalledWith('v1', 'Prod', {
			query: 'env = dev',
			sort: 'name',
		});
	});

	it('saveActiveView is a no-op on a builtin view', () => {
		const api = makeApi();
		const { result } = setup(api);
		act(() => result.current.saveActiveView());
		expect(api.updateView).not.toHaveBeenCalled();
	});

	it('renameView keeps the stored filter', () => {
		const api = makeApi();
		const { result } = setup(api, '', { query: 'other', sort: 'x' });
		act(() => result.current.renameView('v1', 'Renamed'));
		expect(api.updateView).toHaveBeenCalledWith('v1', 'Renamed', CUSTOM.filter);
	});

	it('removing the active view falls back to the default view', async () => {
		const api = makeApi();
		const { result } = setup(api, '?view=v1', CUSTOM.filter);
		await act(() => result.current.removeView('v1'));
		expect(api.deleteView).toHaveBeenCalledWith('v1');
		expect(result.current.activeViewId).toBe('all');
		expect(result.current.filter).toStrictEqual({ query: '', sort: 'name' });
	});

	it('removing an inactive view leaves the selection alone', async () => {
		const api = makeApi();
		const { result } = setup(api, '?view=locked', { query: 'locked', sort: 'x' });
		await act(() => result.current.removeView('v1'));
		expect(result.current.activeViewId).toBe('locked');
		expect(result.current.filter.query).toBe('locked');
	});

	it('swallows delete failures without changing the selection', async () => {
		const api = makeApi();
		api.deleteView.mockRejectedValueOnce(new Error('boom'));
		const { result } = setup(api, '?view=v1', CUSTOM.filter);
		await act(() => result.current.removeView('v1'));
		expect(result.current.activeViewId).toBe('v1');
	});
});
