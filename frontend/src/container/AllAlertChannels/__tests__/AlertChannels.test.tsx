import AlertChannels from 'container/AllAlertChannels';
import { allAlertChannels } from 'mocks-server/__mockdata__/alerts';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';

jest.mock('hooks/useFetch', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		payload: allAlertChannels,
	})),
}));

const successNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: jest.fn(),
		},
	})),
}));

describe('Alert Channels Settings List page', () => {
	beforeEach(() => {
		render(<AlertChannels />);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});
	describe('Should display the Alert Channels page properly', () => {
		it('Should check if "The alerts will be sent to all the configured channels." is visible ', () => {
			expect(screen.getByText('sending_channels_note')).toBeInTheDocument();
		});
		it('Should check if "New Alert Channel" Button is visble ', () => {
			expect(screen.getByText('button_new_channel')).toBeInTheDocument();
		});
		it('Should check if the help icon is visible and displays "tooltip_notification_channels ', async () => {
			const helpIcon = screen.getByLabelText('question-circle');

			fireEvent.mouseOver(helpIcon);

			await waitFor(() => {
				const tooltip = screen.getByText('tooltip_notification_channels');
				expect(tooltip).toBeInTheDocument();
			});
		});
	});
	describe('Should check if the channels table is properly displayed', () => {
		it('Should check if the table columns are properly displayed', () => {
			expect(screen.getByText('column_channel_name')).toBeInTheDocument();
			expect(screen.getByText('column_channel_type')).toBeInTheDocument();
			expect(screen.getByText('column_channel_action')).toBeInTheDocument();
		});

		it('Should check if the data in the table is displayed properly', () => {
			expect(screen.getByText('Dummy-Channel')).toBeInTheDocument();
			expect(screen.getAllByText('slack')[0]).toBeInTheDocument();
			expect(screen.getAllByText('column_channel_edit')[0]).toBeInTheDocument();
			expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
		});

		it('Should check if clicking on Delete displays Success Toast "Channel Deleted Successfully"', async () => {
			const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
			expect(deleteButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(deleteButton);
			});

			await waitFor(() => {
				expect(successNotification).toBeCalledWith({
					message: 'Success',
					description: 'channel_delete_success',
				});
			});
		});
	});
});
