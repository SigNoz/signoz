import { render, screen } from '@testing-library/react';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import * as getYAxisUnitHooks from 'hooks/useGetYAxisUnit';

import DashboardYAxisUnitSelectorWrapper from '../DashboardYAxisUnitSelectorWrapper';

describe('YAxisUnitSelectorV2', () => {
	const mockUseGetYAxisUnit = jest.spyOn(getYAxisUnitHooks, 'default');
	const onSelect = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseGetYAxisUnit.mockReturnValue({
			yAxisUnit: UniversalYAxisUnit.BYTES,
			isLoading: false,
			isError: false,
		});
	});

	it('should render the selector with correct label and value', () => {
		render(
			<DashboardYAxisUnitSelectorWrapper
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				shouldUpdateYAxisUnit={false}
			/>,
		);

		expect(screen.getByText('Bytes label')).toBeInTheDocument();
		expect(screen.getByText('Bytes (B)')).toBeInTheDocument();
	});

	it('should call onSelect when showWarning is true and useGetYAxisUnit is called and provides the correct value', () => {
		mockUseGetYAxisUnit.mockReturnValueOnce({
			yAxisUnit: UniversalYAxisUnit.SECONDS,
			isLoading: false,
			isError: false,
		});
		render(
			<DashboardYAxisUnitSelectorWrapper
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				shouldUpdateYAxisUnit
			/>,
		);
		expect(onSelect).toHaveBeenCalledWith(UniversalYAxisUnit.SECONDS);
	});

	it('should not call onSelect when showWarning is false', () => {
		render(
			<DashboardYAxisUnitSelectorWrapper
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				shouldUpdateYAxisUnit={false}
			/>,
		);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('should call onSelect when yAxisUnit is undefined even if showWarning is true', () => {
		mockUseGetYAxisUnit.mockReturnValueOnce({
			yAxisUnit: undefined,
			isLoading: false,
			isError: false,
		});
		render(
			<DashboardYAxisUnitSelectorWrapper
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				shouldUpdateYAxisUnit
			/>,
		);
		expect(onSelect).toHaveBeenCalledWith('');
	});
});
