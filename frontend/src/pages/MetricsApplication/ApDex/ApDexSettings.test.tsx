import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { axiosResponseThresholdData } from './__mock__/axiosResponseMockThresholdData';
import ApDexSettings from './ApDexSettings';

vi.mock('hooks/apDex/useSetApDexSettings', () => ({
	__esModule: true,
	useSetApDexSettings: vi.fn().mockReturnValue({
		mutateAsync: vi.fn(),
		isLoading: false,
		error: null,
	}),
}));

describe('ApDexSettings', () => {
	it('should render the component', () => {
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={vi.fn()}
				isLoading={false}
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={vi.fn()}
			/>,
		);

		expect(screen.getByText('Application Settings')).toBeInTheDocument();
	});

	it('should render the spinner when the data is loading', () => {
		const { container } = render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={vi.fn()}
				isLoading
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={vi.fn()}
			/>,
		);

		const loadingSpan = container.querySelector('[aria-label="loading"]');

		// Assert that the loading span is found
		expect(loadingSpan).toBeInTheDocument();
	});

	it('should close the popover when the cancel button is clicked', async () => {
		const mockHandlePopOverClose = vi.fn();
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={mockHandlePopOverClose}
				isLoading={false}
				data={axiosResponseThresholdData}
				refetchGetApDexSetting={vi.fn()}
			/>,
		);

		const button = screen.getByText('Cancel');
		fireEvent.click(button);
		await waitFor(() => {
			expect(mockHandlePopOverClose).toHaveBeenCalled();
		});
	});
});
