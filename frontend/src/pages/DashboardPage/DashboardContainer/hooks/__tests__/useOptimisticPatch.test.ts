import { renderHook } from '@testing-library/react';
import { useMutation, useQueryClient } from 'react-query';
// eslint-disable-next-line no-restricted-imports -- the hook's own test mocks and asserts the underlying patchDashboardV2 call.
import { patchDashboardV2 } from 'api/generated/services/dashboard';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesPatchOpDTO } from 'api/generated/services/sigNoz.schemas';

import { useOptimisticPatch } from '../useOptimisticPatch';

const QUERY_KEY = ['/api/v2/dashboards/dash-1'];

jest.mock('react-query', () => ({
	useMutation: jest.fn(),
	useQueryClient: jest.fn(),
}));

jest.mock('api/generated/services/dashboard', () => ({
	patchDashboardV2: jest.fn(),
	getGetDashboardV2QueryKey: jest.fn(() => ['/api/v2/dashboards/dash-1']),
}));

jest.mock('../../store/useDashboardStore', () => ({
	useDashboardStore: jest.fn(
		(selector: (s: { dashboardId: string; isEditable: boolean }) => unknown) =>
			selector({ dashboardId: 'dash-1', isEditable: true }),
	),
}));

const queryClient = {
	cancelQueries: jest.fn().mockResolvedValue(undefined),
	getQueryData: jest.fn(),
	setQueryData: jest.fn(),
	invalidateQueries: jest.fn().mockResolvedValue(undefined),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let captured: { fn: (ops: any) => unknown; options: any };

function dashboardEnvelope(name: string): GetDashboardV2200 {
	return {
		data: { spec: { display: { name } } },
	} as unknown as GetDashboardV2200;
}

const replaceNameOp = {
	op: DashboardtypesPatchOpDTO.replace,
	path: '/spec/display/name',
	value: 'B',
};

beforeEach(() => {
	jest.clearAllMocks();
	(useQueryClient as jest.Mock).mockReturnValue(queryClient);
	(useMutation as jest.Mock).mockImplementation((fn, options) => {
		captured = { fn, options };
		return { mutateAsync: jest.fn(), isLoading: false };
	});
	renderHook(() => useOptimisticPatch());
});

describe('useOptimisticPatch', () => {
	it('mutationFn sends the ops to patchDashboardV2 for the current dashboard', () => {
		captured.fn([replaceNameOp]);
		expect(patchDashboardV2).toHaveBeenCalledWith({ id: 'dash-1' }, [
			replaceNameOp,
		]);
	});

	it('onMutate cancels fetches, snapshots, and writes the patched dashboard to the cache', async () => {
		const previous = dashboardEnvelope('A');
		queryClient.getQueryData.mockReturnValue(previous);

		const context = await captured.options.onMutate([replaceNameOp]);

		expect(queryClient.cancelQueries).toHaveBeenCalledWith(QUERY_KEY);
		// Optimistic write reflects the op immediately.
		expect(queryClient.setQueryData).toHaveBeenCalledWith(QUERY_KEY, {
			data: { spec: { display: { name: 'B' } } },
		});
		// Snapshot returned for rollback; original left untouched.
		expect(context).toStrictEqual({ previous });
		expect(previous.data).toStrictEqual({ spec: { display: { name: 'A' } } });
	});

	it('onMutate is a no-op write when there is no cached dashboard', async () => {
		queryClient.getQueryData.mockReturnValue(undefined);
		const context = await captured.options.onMutate([replaceNameOp]);
		expect(queryClient.setQueryData).not.toHaveBeenCalled();
		expect(context).toStrictEqual({ previous: undefined });
	});

	it('onError rolls the cache back to the snapshot', () => {
		const previous = dashboardEnvelope('A');
		captured.options.onError(new Error('boom'), [replaceNameOp], { previous });
		expect(queryClient.setQueryData).toHaveBeenCalledWith(QUERY_KEY, previous);
	});

	it('onError without a snapshot does not touch the cache', () => {
		captured.options.onError(new Error('boom'), [replaceNameOp], {});
		expect(queryClient.setQueryData).not.toHaveBeenCalled();
	});

	it('onSuccess reconciles the cache from the PATCH response without a refetch', () => {
		const response = {
			data: { spec: { display: { name: 'B' } } },
			status: 'success',
		};
		captured.options.onSuccess(response);

		expect(queryClient.setQueryData).toHaveBeenCalledWith(
			QUERY_KEY,
			expect.any(Function),
		);
		// The updater merges the server data into the existing envelope.
		const updater = queryClient.setQueryData.mock.calls[0][1];
		expect(
			updater({ data: { spec: { display: { name: 'A' } } }, foo: 1 }),
		).toStrictEqual({ data: { spec: { display: { name: 'B' } } }, foo: 1 });
		// No follow-up GET (that could read stale data and flicker the UI back).
		expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
	});
});
