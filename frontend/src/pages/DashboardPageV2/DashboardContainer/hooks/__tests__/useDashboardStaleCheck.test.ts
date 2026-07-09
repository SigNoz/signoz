import { act, renderHook, waitFor } from '@testing-library/react';
import { getDashboardV2 } from 'api/generated/services/dashboard';

import { useDashboardStaleCheck } from '../useDashboardStaleCheck';

const mockUseIsMutating = jest.fn();
jest.mock('react-query', () => ({
	useIsMutating: (): number => mockUseIsMutating(),
}));
jest.mock('api/generated/services/dashboard', () => ({
	getDashboardV2: jest.fn(),
}));

const mockGetDashboard = getDashboardV2 as jest.Mock;

function setVisibility(state: 'visible' | 'hidden'): void {
	Object.defineProperty(document, 'visibilityState', {
		configurable: true,
		get: () => state,
	});
}

/** Simulate the tab coming back into view with the given server `updatedAt`. */
async function returnToTab(serverUpdatedAt: string): Promise<void> {
	mockGetDashboard.mockResolvedValueOnce({ data: { updatedAt: serverUpdatedAt } });
	setVisibility('visible');
	await act(async () => {
		document.dispatchEvent(new Event('visibilitychange'));
	});
}

describe('useDashboardStaleCheck', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsMutating.mockReturnValue(0);
		setVisibility('visible');
	});

	it('does not fetch on first load — only when the tab returns', async () => {
		renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		expect(mockGetDashboard).not.toHaveBeenCalled();

		await returnToTab('2026-07-08T09:00:00Z');
		expect(mockGetDashboard).toHaveBeenCalledTimes(1);
		expect(mockGetDashboard).toHaveBeenCalledWith({ id: 'd1' });
	});

	it('prompts when the server copy is newer than the loaded one', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T10:00:00Z');
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
	});

	it('does not prompt when the versions match', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T09:00:00Z');
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not prompt when the loaded copy is newer (own edit)', async () => {
		// Own save advanced the render cache to 10:00; the server probe still reads 09:00.
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T10:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T09:00:00Z');
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not prompt while a mutation is in flight (optimistic save)', async () => {
		mockUseIsMutating.mockReturnValue(1);
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T10:00:00Z');
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not probe while the tab is hidden', async () => {
		renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		setVisibility('hidden');
		await act(async () => {
			document.dispatchEvent(new Event('visibilitychange'));
		});
		expect(mockGetDashboard).not.toHaveBeenCalled();
	});

	it('stops prompting for a version once dismissed', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T10:00:00Z');
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
		act(() => result.current.dismiss());
		expect(result.current.showPrompt).toBe(false);
	});

	it('reload refetches and closes the prompt immediately', async () => {
		const refetch = jest.fn();
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', refetch),
		);
		await returnToTab('2026-07-08T10:00:00Z');
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
		act(() => result.current.reload());
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(result.current.showPrompt).toBe(false);
	});

	it('re-prompts when a newer version appears after a reload', async () => {
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		await returnToTab('2026-07-08T10:00:00Z');
		act(() => result.current.reload());
		expect(result.current.showPrompt).toBe(false);

		await returnToTab('2026-07-08T10:05:00Z');
		await waitFor(() => expect(result.current.showPrompt).toBe(true));
	});
});
