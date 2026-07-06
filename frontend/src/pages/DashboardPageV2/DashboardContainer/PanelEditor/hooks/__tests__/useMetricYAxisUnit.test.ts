import { renderHook } from '@testing-library/react';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';

import { useMetricYAxisUnit } from '../useMetricYAxisUnit';

jest.mock('hooks/useGetYAxisUnit', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseGetYAxisUnit = useGetYAxisUnit as unknown as jest.Mock;

function mockMetricUnit(
	yAxisUnit: string | undefined,
	isLoading = false,
): void {
	mockUseGetYAxisUnit.mockReturnValue({ yAxisUnit, isLoading, isError: false });
}

describe('useMetricYAxisUnit', () => {
	beforeEach(() => jest.clearAllMocks());

	it('seeds the unit from the metric on a new panel', () => {
		mockMetricUnit('bytes');
		const onSelectUnit = jest.fn();

		renderHook(() =>
			useMetricYAxisUnit({ isNewPanel: true, unit: undefined, onSelectUnit }),
		);

		expect(onSelectUnit).toHaveBeenCalledWith('bytes');
	});

	it('does not seed when not a new panel', () => {
		mockMetricUnit('bytes');
		const onSelectUnit = jest.fn();

		renderHook(() =>
			useMetricYAxisUnit({ isNewPanel: false, unit: undefined, onSelectUnit }),
		);

		expect(onSelectUnit).not.toHaveBeenCalled();
	});

	it('does not seed when the metric has no unit', () => {
		mockMetricUnit(undefined);
		const onSelectUnit = jest.fn();

		renderHook(() =>
			useMetricYAxisUnit({ isNewPanel: true, unit: undefined, onSelectUnit }),
		);

		expect(onSelectUnit).not.toHaveBeenCalled();
	});

	it('does not seed when the unit already matches the metric', () => {
		mockMetricUnit('bytes');
		const onSelectUnit = jest.fn();

		renderHook(() =>
			useMetricYAxisUnit({ isNewPanel: true, unit: 'bytes', onSelectUnit }),
		);

		expect(onSelectUnit).not.toHaveBeenCalled();
	});

	it('re-seeds when the resolved metric unit changes', () => {
		mockMetricUnit('bytes');
		const onSelectUnit = jest.fn();

		const { rerender } = renderHook(
			(props: { unit: string | undefined }) =>
				useMetricYAxisUnit({
					isNewPanel: true,
					unit: props.unit,
					onSelectUnit,
				}),
			{ initialProps: { unit: undefined as string | undefined } },
		);
		expect(onSelectUnit).toHaveBeenLastCalledWith('bytes');

		// The metric changes; the panel now holds the previously-seeded unit.
		mockMetricUnit('ms');
		rerender({ unit: 'bytes' });

		expect(onSelectUnit).toHaveBeenLastCalledWith('ms');
	});

	it('returns the resolved metric unit and loading state', () => {
		mockMetricUnit('bytes', true);

		const { result } = renderHook(() =>
			useMetricYAxisUnit({
				isNewPanel: false,
				unit: undefined,
				onSelectUnit: jest.fn(),
			}),
		);

		expect(result.current.metricUnit).toBe('bytes');
		expect(result.current.isLoading).toBe(true);
	});
});
