import { renderHook } from '@testing-library/react';
import { patchDashboardV2 } from 'api/generated/services/dashboard';

import { useDashboardStore } from '../../../../store/useDashboardStore';
import type { DashboardSection } from '../../../../utils';
import { useClonePanel } from '../useClonePanel';

jest.mock('api/generated/services/dashboard', () => ({
	patchDashboardV2: jest.fn().mockResolvedValue(undefined),
}));

const mockToastPromise = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { promise: (...args: unknown[]): unknown => mockToastPromise(...args) },
}));

jest.mock('uuid', () => ({ v4: (): string => 'cloned-id' }));

const mockPatch = patchDashboardV2 as unknown as jest.Mock;

const sourcePanel = {
	kind: 'Panel',
	spec: {
		display: { name: 'CPU' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardSection['items'][number]['panel'];

function sections(): DashboardSection[] {
	return [
		{
			id: 'section-0',
			layoutIndex: 0,
			title: 'Overview',
			repeatVariable: undefined,
			items: [
				{ id: 'p1', x: 0, y: 0, width: 8, height: 5, panel: sourcePanel },
				{ id: 'p2', x: 8, y: 0, width: 4, height: 5, panel: sourcePanel },
			],
		},
	];
}

describe('useClonePanel', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useDashboardStore.setState({ dashboardId: 'dash-1', refetch: jest.fn() });
	});

	it('patches an add of the deep-copied spec + a new item under the same section', async () => {
		const { result } = renderHook(() => useClonePanel({ sections: sections() }));

		await result.current({ panelId: 'p1', layoutIndex: 0 });

		expect(mockPatch).toHaveBeenCalledWith({ id: 'dash-1' }, [
			{
				op: 'add',
				path: '/spec/panels/cloned-id',
				value: sourcePanel,
			},
			{
				op: 'add',
				path: '/spec/layouts/0/spec/items/-',
				value: {
					// Same dimensions as the source panel (p1: 8x5). The last row is
					// full (8 + 4 = 12 cols), so the 8-wide clone wraps to a fresh row
					// at the section bottom: max(y + height) = 5.
					x: 0,
					y: 5,
					width: 8,
					height: 5,
					content: { $ref: '#/spec/panels/cloned-id' },
				},
			},
		]);
	});

	it('places the clone beside the last row when it fits', async () => {
		const oneNarrowItem: DashboardSection[] = [
			{
				id: 'section-0',
				layoutIndex: 0,
				title: 'Overview',
				repeatVariable: undefined,
				items: [{ id: 'p1', x: 0, y: 0, width: 4, height: 5, panel: sourcePanel }],
			},
		];
		const { result } = renderHook(() =>
			useClonePanel({ sections: oneNarrowItem }),
		);

		await result.current({ panelId: 'p1', layoutIndex: 0 });

		const ops = mockPatch.mock.calls[0][1];
		// Room in the last row (4 + 4 = 8 ≤ 12 cols) → sits to the right at y:0.
		expect(ops[1].value).toMatchObject({ x: 4, y: 0, width: 4, height: 5 });
	});

	it('deep-copies the spec — the cloned value is not the same object reference', async () => {
		const { result } = renderHook(() => useClonePanel({ sections: sections() }));

		await result.current({ panelId: 'p1', layoutIndex: 0 });

		const ops = mockPatch.mock.calls[0][1];
		expect(ops[0].value).toStrictEqual(sourcePanel);
		expect(ops[0].value).not.toBe(sourcePanel);
	});

	it('no-ops when the panel is not found in the section', async () => {
		const { result } = renderHook(() => useClonePanel({ sections: sections() }));

		await result.current({ panelId: 'missing', layoutIndex: 0 });

		expect(mockPatch).not.toHaveBeenCalled();
		expect(mockToastPromise).not.toHaveBeenCalled();
	});

	it('reports in-flight → done/failed state via toast.promise', async () => {
		const { result } = renderHook(() => useClonePanel({ sections: sections() }));

		await result.current({ panelId: 'p1', layoutIndex: 0 });

		expect(mockToastPromise).toHaveBeenCalledWith(
			expect.any(Promise),
			expect.objectContaining({
				loading: 'Cloning panel…',
				success: 'Panel cloned',
				error: 'Failed to clone panel',
			}),
		);
	});

	it('swallows a patch rejection (toast owns the error UX) — does not throw', async () => {
		mockPatch.mockRejectedValueOnce(new Error('boom'));
		const { result } = renderHook(() => useClonePanel({ sections: sections() }));

		await expect(
			result.current({ panelId: 'p1', layoutIndex: 0 }),
		).resolves.toBeUndefined();
		expect(mockToastPromise).toHaveBeenCalled();
	});
});
