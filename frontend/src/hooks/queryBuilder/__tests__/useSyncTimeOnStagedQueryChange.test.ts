import { renderHook } from '@testing-library/react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';

import { useSyncTimeOnStagedQueryChange } from '../useSyncTimeOnStagedQueryChange';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
	useDispatch: (): jest.Mock => mockDispatch,
	useSelector: jest.fn(),
}));

jest.mock('store/actions', () => ({
	UpdateTimeInterval: jest.fn((time: string) => ({
		type: 'UPDATE_TIME_INTERVAL_THUNK',
		payload: time,
	})),
}));

const mockedUseSelector = useSelector as jest.Mock;
const mockedUpdateTimeInterval = UpdateTimeInterval as unknown as jest.Mock;

const setSelectedTime = (value: string): void => {
	mockedUseSelector.mockImplementation(
		(selector: (state: { globalTime: { selectedTime: string } }) => unknown) =>
			selector({ globalTime: { selectedTime: value } }),
	);
};

describe('useSyncTimeOnStagedQueryChange', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setSelectedTime('1h');
	});

	it('does not dispatch on initial mount when stagedQueryId is undefined', () => {
		renderHook(() => useSyncTimeOnStagedQueryChange(undefined));
		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it('does not dispatch on initial mount when stagedQueryId is already defined', () => {
		renderHook(() => useSyncTimeOnStagedQueryChange('initial-id'));
		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it('does not dispatch when stagedQueryId transitions from undefined to defined (first staged query arriving)', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: undefined as string | undefined } },
		);

		rerender({ id: 'first-id' });

		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it('dispatches UpdateTimeInterval with current selectedTime when stagedQueryId changes', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'first-id' as string | undefined } },
		);

		expect(mockDispatch).not.toHaveBeenCalled();

		rerender({ id: 'second-id' });

		expect(mockedUpdateTimeInterval).toHaveBeenCalledTimes(1);
		expect(mockedUpdateTimeInterval).toHaveBeenCalledWith('1h');
		expect(mockDispatch).toHaveBeenCalledTimes(1);
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'UPDATE_TIME_INTERVAL_THUNK',
			payload: '1h',
		});
	});

	it('does not dispatch when selectedTime is "custom" even if stagedQueryId changes', () => {
		setSelectedTime('custom');

		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'first-id' as string | undefined } },
		);

		rerender({ id: 'second-id' });

		expect(mockDispatch).not.toHaveBeenCalled();
		expect(mockedUpdateTimeInterval).not.toHaveBeenCalled();
	});

	it('does not dispatch when only selectedTime changes (stagedQueryId stable)', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'stable-id' as string | undefined } },
		);

		setSelectedTime('5m');
		rerender({ id: 'stable-id' });

		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it('dispatches once per distinct stagedQueryId change', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'a' as string | undefined } },
		);

		rerender({ id: 'b' });
		rerender({ id: 'c' });
		rerender({ id: 'c' }); // no change — should not dispatch again

		expect(mockDispatch).toHaveBeenCalledTimes(2);
	});

	it('does not dispatch when stagedQueryId transitions from defined to undefined', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'first-id' as string | undefined } },
		);

		rerender({ id: undefined });

		expect(mockDispatch).not.toHaveBeenCalled();
	});

	it('uses the latest selectedTime at the moment of stagedQueryId change', () => {
		const { rerender } = renderHook(
			({ id }: { id: string | undefined }) => useSyncTimeOnStagedQueryChange(id),
			{ initialProps: { id: 'a' as string | undefined } },
		);

		setSelectedTime('15m');
		rerender({ id: 'b' });

		expect(mockedUpdateTimeInterval).toHaveBeenCalledWith('15m');
	});
});
