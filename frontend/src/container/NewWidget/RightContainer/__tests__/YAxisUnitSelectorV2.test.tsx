import { render, screen } from '@testing-library/react';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import * as getYAxisUnitHooks from 'hooks/useGetYAxisUnit';

import YAxisUnitSelectorV2 from '../YAxisUnitSelectorV2';

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
			<YAxisUnitSelectorV2
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				showWarning={false}
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
			<YAxisUnitSelectorV2
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				showWarning
			/>,
		);
		expect(onSelect).toHaveBeenCalledWith(UniversalYAxisUnit.SECONDS);
	});

	it('should not call onSelect when showWarning is false', () => {
		render(
			<YAxisUnitSelectorV2
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				showWarning={false}
			/>,
		);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('should not call onSelect when yAxisUnit is undefined even if showWarning is true', () => {
		mockUseGetYAxisUnit.mockReturnValueOnce({
			yAxisUnit: undefined,
			isLoading: false,
			isError: false,
		});
		render(
			<YAxisUnitSelectorV2
				value={UniversalYAxisUnit.BYTES}
				onSelect={onSelect}
				fieldLabel="Bytes label"
				showWarning
			/>,
		);
		expect(onSelect).not.toHaveBeenCalled();
	});
});
