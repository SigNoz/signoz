import { act, renderHook } from '@testing-library/react';

import { useDashboardStaleCheck } from '../useDashboardStaleCheck';

const mockUseQuery = jest.fn();
const mockUseIsMutating = jest.fn();
jest.mock('react-query', () => ({
	useQuery: (...args: unknown[]): unknown => mockUseQuery(...args),
	useIsMutating: (): number => mockUseIsMutating(),
	useQueryClient: (): unknown => ({ getQueryData: jest.fn() }),
}));
jest.mock('api/generated/services/dashboard', () => ({
	getDashboardV2: jest.fn(),
	getGetDashboardV2QueryKey: jest.fn(() => ['/api/v2/dashboards/d1']),
}));

function setServerUpdatedAt(updatedAt: string | undefined): void {
	mockUseQuery.mockReturnValue({ data: { data: { updatedAt } } });
}

describe('useDashboardStaleCheck', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsMutating.mockReturnValue(0);
	});

	it('prompts when the server copy is newer than the loaded one', () => {
		setServerUpdatedAt('2026-07-08T10:00:00Z');
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		expect(result.current.showPrompt).toBe(true);
	});

	it('does not prompt when the versions match', () => {
		setServerUpdatedAt('2026-07-08T09:00:00Z');
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		expect(result.current.showPrompt).toBe(false);
	});

	it('does not prompt while a mutation is in flight (optimistic save)', () => {
		mockUseIsMutating.mockReturnValue(1);
		setServerUpdatedAt('2026-07-08T10:00:00Z');
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		expect(result.current.showPrompt).toBe(false);
	});

	it('stops prompting for a version once dismissed', () => {
		setServerUpdatedAt('2026-07-08T10:00:00Z');
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		expect(result.current.showPrompt).toBe(true);
		act(() => result.current.dismiss());
		expect(result.current.showPrompt).toBe(false);
	});

	it('reload refetches and closes the prompt immediately', () => {
		setServerUpdatedAt('2026-07-08T10:00:00Z');
		const refetch = jest.fn();
		const { result } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', refetch),
		);
		expect(result.current.showPrompt).toBe(true);
		act(() => result.current.reload());
		expect(refetch).toHaveBeenCalledTimes(1);
		// Closes on the click itself, not dependent on the refetched loaded copy
		// catching up to the server copy (two separate queries).
		expect(result.current.showPrompt).toBe(false);
	});

	it('re-prompts when a newer version appears after a reload', () => {
		setServerUpdatedAt('2026-07-08T10:00:00Z');
		const { result, rerender } = renderHook(() =>
			useDashboardStaleCheck('d1', '2026-07-08T09:00:00Z', jest.fn()),
		);
		act(() => result.current.reload());
		expect(result.current.showPrompt).toBe(false);

		// A later external change (new updatedAt) must surface again.
		setServerUpdatedAt('2026-07-08T10:05:00Z');
		rerender();
		expect(result.current.showPrompt).toBe(true);
	});
});
