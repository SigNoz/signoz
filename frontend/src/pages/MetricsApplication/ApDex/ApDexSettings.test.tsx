import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosResponse } from 'axios';

import ApDexSettings from './ApDexSettings';

const mockData = {
	data: [
		{
			threshold: 0.5,
		},
	],
} as AxiosResponse;

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
				data={mockData}
				refetch={jest.fn()}
			/>,
		);

		expect(screen.getByText('Application Settings')).toBeInTheDocument();
	});

	it('should render the spinner when the data is loading', () => {
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={jest.fn()}
				isLoading
				data={mockData}
				refetch={jest.fn()}
			/>,
		);

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('should close the popover when the cancel button is clicked', async () => {
		const mockHandlePopOverClose = jest.fn();
		render(
			<ApDexSettings
				servicename="mockServiceName"
				handlePopOverClose={mockHandlePopOverClose}
				isLoading={false}
				data={mockData}
				refetch={jest.fn()}
			/>,
		);

		const button = screen.getByText('Cancel');
		fireEvent.click(button);
		await waitFor(() => {
			expect(mockHandlePopOverClose).toHaveBeenCalled();
		});
	});
});
