import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { APPLICATION_SETTINGS } from '../constants';
import ApDexApplication from './ApDexApplication';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): {
		servicename: string;
	} => ({ servicename: 'mockServiceName' }),
}));

jest.mock('hooks/apDex/useGetApDexSettings', () => ({
	__esModule: true,
	useGetApDexSettings: jest.fn().mockReturnValue({
		data: {
			data: [
				{
					threshold: 0.5,
				},
			],
		},
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
}));

jest.mock('hooks/apDex/useSetApDexSettings', () => ({
	__esModule: true,
	useSetApDexSettings: jest.fn().mockReturnValue({
		mutateAsync: jest.fn(),
		isLoading: false,
		error: null,
	}),
}));

describe('ApDexApplication', () => {
	it('should render the component', () => {
		render(<ApDexApplication />);

		expect(screen.getByText('Settings')).toBeInTheDocument();
	});

	it('should open the popover when the settings button is clicked', async () => {
		render(<ApDexApplication />);

		const button = screen.getByText('Settings');
		fireEvent.click(button);
		await waitFor(() => {
			expect(screen.getByText(APPLICATION_SETTINGS)).toBeInTheDocument();
		});
	});

	it('should close the popover when the close button is clicked', async () => {
		render(<ApDexApplication />);

		const button = screen.getByText('Settings');
		fireEvent.click(button);
		await waitFor(() => {
			expect(screen.getByText(APPLICATION_SETTINGS)).toBeInTheDocument();
		});

		const closeButton = screen.getByText('Cancel');
		fireEvent.click(closeButton);
		await waitFor(() => {
			expect(screen.queryByText(APPLICATION_SETTINGS)).not.toBeInTheDocument();
		});
	});
});
