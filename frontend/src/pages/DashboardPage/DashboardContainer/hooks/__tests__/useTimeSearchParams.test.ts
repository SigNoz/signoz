import { renderHook } from '@testing-library/react';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';

import { useTimeSearchParams } from '../useTimeSearchParams';

let mockGlobalTime = {
	selectedTime: '30m',
	minTime: 0,
	maxTime: 0,
};
jest.mock('react-redux', () => ({
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({ globalTime: mockGlobalTime }),
}));

describe('useTimeSearchParams', () => {
	it('returns a relativeTime query string for a relative selection', () => {
		mockGlobalTime = { selectedTime: '6h', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useTimeSearchParams());

		expect(result.current).toBe('relativeTime=6h');
	});

	it('returns an absolute ms pair for a custom selection', () => {
		mockGlobalTime = {
			selectedTime: 'custom',
			minTime: 1000 * NANO_SECOND_MULTIPLIER,
			maxTime: 2000 * NANO_SECOND_MULTIPLIER,
		};
		const { result } = renderHook(() => useTimeSearchParams());

		expect(result.current).toContain('startTime=1000');
		expect(result.current).toContain('endTime=2000');
		expect(result.current).not.toContain('relativeTime');
	});

	it('returns an empty string for an uninitialized custom window', () => {
		mockGlobalTime = { selectedTime: 'custom', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useTimeSearchParams());

		expect(result.current).toBe('');
	});
});
