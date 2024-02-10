import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { axiosResponseThresholdData } from './__mock__/axiosResponseMockThresholdData';
import ApDexSettings from './ApDexSettings';

jest.mock('hooks/apDex/useSetApDexSettings', () => ({
	__esModule: true,
	useSetApDexSettings: jest.fn().mockReturnValue({
		mutateAsync: jest.fn(),
		isLoading: false,
		error: null,
	}),
}));

describe('ApDexSettings', () => {
	it('should render the component', () => {
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={jest.fn()}
				isLoading={false}
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={jest.fn()}
			/>,
		);

		expect(screen.getByText('Application Settings')).toBeInTheDocument();
	});

	it('should render the spinner when the data is loading', () => {
		const { container } = render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={jest.fn()}
				isLoading
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={jest.fn()}
			/>,
		);

		const loadingSpan = container.querySelector('[aria-label="loading"]');

		// Assert that the loading span is found
		expect(loadingSpan).toBeInTheDocument();
	});

	it('should close the popover when the cancel button is clicked', async () => {
		const mockHandlePopOverClose = jest.fn();
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={mockHandlePopOverClose}
				isLoading={false}
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={jest.fn()}
			/>,
		);

		const button = screen.getByText('Cancel');
		fireEvent.click(button);
		await waitFor(() => {
			expect(mockHandlePopOverClose).toHaveBeenCalled();
		});
	});
});
