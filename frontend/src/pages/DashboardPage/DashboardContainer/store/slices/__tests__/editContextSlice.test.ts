import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { useDashboardStore } from '../../useDashboardStore';
import type { DashboardQuerySource } from '../editContextSlice';

const refetch = (): void => undefined;

const systemSource: DashboardQuerySource = {
	queryKey: ['/api/v2/dashboards/system/ai-o11y-overview'],
	select: (response: { data: DashboardtypesGettableDashboardV2DTO }) =>
		response.data,
};

function store(): ReturnType<typeof useDashboardStore.getState> {
	return useDashboardStore.getState();
}

describe('editContextSlice.setEditContext', () => {
	beforeEach(() => {
		store().setEditContext({ dashboardId: '', refetch });
	});

	it('defaults to the dashboards API entry and an editable mount', () => {
		store().setEditContext({ dashboardId: 'dash-1', refetch });

		expect(store().dashboardQuerySource).toBeNull();
		expect(store().readOnly).toBe(false);
	});

	it("stores a host's source and read-only flag", () => {
		store().setEditContext({
			dashboardId: 'system',
			refetch,
			source: systemSource,
			readOnly: true,
		});

		expect(store().dashboardQuerySource).toBe(systemSource);
		expect(store().readOnly).toBe(true);
	});

	it('clears read-only when the next mount does not ask for it', () => {
		store().setEditContext({
			dashboardId: 'system',
			refetch,
			source: systemSource,
			readOnly: true,
		});
		store().setEditContext({ dashboardId: 'dash-1', refetch });

		expect(store().readOnly).toBe(false);
		expect(store().dashboardQuerySource).toBeNull();
	});

	// Called during render: a set on every call would re-render subscribers in a loop.
	it('is a no-op when called again with equal values', () => {
		store().setEditContext({ dashboardId: 'dash-1', refetch });
		const listener = jest.fn();
		const unsubscribe = useDashboardStore.subscribe(listener);

		store().setEditContext({ dashboardId: 'dash-1', refetch });

		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('is a no-op for an equal inline controls object', () => {
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			controls: { header: false },
		});
		const listener = jest.fn();
		const unsubscribe = useDashboardStore.subscribe(listener);

		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			controls: { header: false },
		});

		expect(listener).not.toHaveBeenCalled();
		expect(store().controls.header.share).toBe(false);
		unsubscribe();
	});

	it('resolves controls against read-only', () => {
		store().setEditContext({ dashboardId: 'dash-1', refetch, readOnly: true });

		expect(store().controls.panelActions.edit).toBe(false);
		expect(store().controls.panelActions.view).toBe(true);
	});

	it('treats a runner with the same key as unchanged, a new key as a change', () => {
		const run = jest.fn();
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			queryRunner: { key: 'public:a', run },
		});
		const listener = jest.fn();
		const unsubscribe = useDashboardStore.subscribe(listener);

		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			queryRunner: { key: 'public:a', run: jest.fn() },
		});
		expect(listener).not.toHaveBeenCalled();

		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			queryRunner: { key: 'public:b', run },
		});
		expect(store().queryRunner?.key).toBe('public:b');
		unsubscribe();
	});
});
