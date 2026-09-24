import { act, renderHook } from '@testing-library/react';

import { useConfirmableAction } from '../useConfirmableAction';

describe('useConfirmableAction', () => {
	it('starts closed and idle', () => {
		const { result } = renderHook(() =>
			useConfirmableAction(jest.fn().mockResolvedValue(undefined)),
		);
		expect(result.current.open).toBe(false);
		expect(result.current.isPending).toBe(false);
	});

	it('request() opens the prompt without running the action', () => {
		const action = jest.fn().mockResolvedValue(undefined);
		const { result } = renderHook(() => useConfirmableAction(action));

		act(() => result.current.request());

		expect(result.current.open).toBe(true);
		expect(action).not.toHaveBeenCalled();
	});

	it('confirm() runs the action and closes on success', async () => {
		const action = jest.fn().mockResolvedValue(undefined);
		const { result } = renderHook(() => useConfirmableAction(action));

		act(() => result.current.request());
		await act(async () => {
			await result.current.confirm();
		});

		expect(action).toHaveBeenCalledTimes(1);
		expect(result.current.open).toBe(false);
		expect(result.current.isPending).toBe(false);
	});

	it('keeps the prompt open and resets pending when the action rejects', async () => {
		const action = jest.fn().mockRejectedValue(new Error('boom'));
		const { result } = renderHook(() => useConfirmableAction(action));

		act(() => result.current.request());
		await act(async () => {
			await expect(result.current.confirm()).rejects.toThrow('boom');
		});

		expect(result.current.open).toBe(true);
		expect(result.current.isPending).toBe(false);
	});

	it('cancel() closes the prompt without running the action', () => {
		const action = jest.fn().mockResolvedValue(undefined);
		const { result } = renderHook(() => useConfirmableAction(action));

		act(() => result.current.request());
		act(() => result.current.cancel());

		expect(result.current.open).toBe(false);
		expect(action).not.toHaveBeenCalled();
	});
});
