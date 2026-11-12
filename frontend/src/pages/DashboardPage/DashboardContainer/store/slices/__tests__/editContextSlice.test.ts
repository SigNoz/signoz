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

	it('is a no-op for an equal inline variables object', () => {
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			variables: { service: 'frontend' },
		});
		const listener = jest.fn();
		const unsubscribe = useDashboardStore.subscribe(listener);

		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			variables: { service: 'frontend' },
		});

		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('stores a changed page value', () => {
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			variables: { service: 'frontend' },
		});
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			variables: { service: 'checkout' },
		});

		expect(store().pageVariables).toStrictEqual({ service: 'checkout' });
	});

	it('never saves page-set values with the rest of the selection', () => {
		store().setEditContext({
			dashboardId: 'dash-1',
			refetch,
			variables: { service: 'frontend' },
		});
		store().setVariableValues('dash-1', {
			service: { value: 'frontend', allSelected: false },
			env: { value: 'prod', allSelected: false },
		});

		const saved = useDashboardStore.persist
			.getOptions()
			.partialize?.(store()) as { variableValues: Record<string, object> };

		expect(saved.variableValues['dash-1']).toStrictEqual({
			env: { value: 'prod', allSelected: false },
		});
	});
});
