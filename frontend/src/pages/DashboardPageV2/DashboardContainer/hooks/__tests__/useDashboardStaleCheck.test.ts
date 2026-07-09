import { act, renderHook, waitFor } from '@testing-library/react';
import { getDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { useDashboardStaleCheck } from '../useDashboardStaleCheck';

const mockUseIsMutating = jest.fn();
jest.mock('react-query', () => ({
	useIsMutating: (): number => mockUseIsMutating(),
}));
jest.mock('api/generated/services/dashboard', () => ({
	getDashboardV2: jest.fn(),
}));

const mockGetDashboard = getDashboardV2 as jest.Mock;

const SPEC_A = { panels: { p1: {} } };
const SPEC_B = { panels: { p1: {}, p2: {} } };

function loaded(
	updatedAt: string,
	spec: unknown = SPEC_A,
): DashboardtypesGettableDashboardV2DTO {
	return ({ id: 'd1', updatedAt, spec } as unknown) as DashboardtypesGettableDashboardV2DTO;
}

function setVisibility(state: 'visible' | 'hidden'): void {
	Object.defineProperty(document, 'visibilityState', {
		configurable: true,
		get: () => state,
	});
}

/** Simulate the tab/window coming back with the given server copy. */
async function comeBack(
	serverUpdatedAt: string,
	serverSpec: unknown,
	via: 'visibilitychange' | 'focus' = 'visibilitychange',
): Promise<void> {
	mockGetDashboard.mockResolvedValueOnce({
		data: { updatedAt: serverUpdatedAt, spec: serverSpec },
	});
	setVisibility('visible');
	await act(async () => {
		if (via === 'focus') {
			window.dispatchEvent(new Event('focus'));
		} else {
			document.dispatchEvent(new Event('visibilitychange'));
		}
	});
}

describe('useDashboardStaleCheck', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsMutating.mockReturnValue(0);
		setVisibility('visible');
	});

	it('does not fetch on first load — only when the tab/window returns', async () => {
		renderHook(() => useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z'), jest.fn()));
		expect(mockGetDashboard).not.toHaveBeenCalled();

		await comeBack('2026-07-08T09:00:00Z', SPEC_A);
		expect(mockGetDashboard).toHaveBeenCalledWith({ id: 'd1' });
	});

	it('also probes on window focus (returning from another app)', async () => {
		renderHook(() => useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z'), jest.fn()));
		await comeBack('2026-07-08T09:00:00Z', SPEC_A, 'focus');
		expect(mockGetDashboard).toHaveBeenCalledTimes(1);
	});

	it('prompts when the server is newer AND the content (spec) differs', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), jest.fn()),
		);
		await comeBack('2026-07-08T10:00:00Z', SPEC_B);
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
	});

	it('does NOT prompt when the server is newer but the spec is unchanged (lock/unlock)', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), jest.fn()),
		);
		// updatedAt bumped, spec identical → metadata-only change (e.g. lock/unlock).
		await comeBack('2026-07-08T10:00:00Z', SPEC_A);
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not prompt when the loaded copy is newer (own edit)', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T10:00:00Z', SPEC_A), jest.fn()),
		);
		await comeBack('2026-07-08T09:00:00Z', SPEC_B);
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not prompt while a mutation is in flight (optimistic save)', async () => {
		mockUseIsMutating.mockReturnValue(1);
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), jest.fn()),
		);
		await comeBack('2026-07-08T10:00:00Z', SPEC_B);
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not probe while the tab is hidden', async () => {
		renderHook(() => useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z'), jest.fn()));
		setVisibility('hidden');
		await act(async () => {
			document.dispatchEvent(new Event('visibilitychange'));
		});
		expect(mockGetDashboard).not.toHaveBeenCalled();
	});

	it('stops prompting for a version once dismissed', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), jest.fn()),
		);
		await comeBack('2026-07-08T10:00:00Z', SPEC_B);
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
		act(() => result.current.dismiss());
		expect(result.current.showPrompt).toBe(false);
	});

	it('reload refetches and closes the prompt immediately', async () => {
		const refetch = jest.fn();
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), refetch),
		);
		await comeBack('2026-07-08T10:00:00Z', SPEC_B);
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
		act(() => result.current.reload());
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(result.current.showPrompt).toBe(false);
	});

	it('re-prompts when a newer, different version appears after a reload', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck(loaded('2026-07-08T09:00:00Z', SPEC_A), jest.fn()),
		);
		await comeBack('2026-07-08T10:00:00Z', SPEC_B);
		act(() => result.current.reload());
		expect(result.current.showPrompt).toBe(false);

		await comeBack('2026-07-08T10:05:00Z', { panels: { p3: {} } });
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
	});
});
