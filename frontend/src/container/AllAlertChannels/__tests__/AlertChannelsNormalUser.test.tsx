/* eslint-disable sonarjs/no-identical-functions */
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

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

jest.mock('hooks/useComponentPermission', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => [false]),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.ALL_CHANNELS}`,
	}),
}));

describe('Alert Channels Settings List page (Normal User)', () => {
	beforeEach(async () => {
		jest.useFakeTimers();
		render(<AlertChannels />);
		await waitFor(() =>
			expect(screen.getByText('sending_channels_note')).toBeInTheDocument(),
		);
	});
	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
	});
	describe('Should display the Alert Channels page properly', () => {
		it('Should check if "The alerts will be sent to all the configured channels." is visible ', async () => {
			await waitFor(() =>
				expect(screen.getByText('sending_channels_note')).toBeInTheDocument(),
			);
		});

		it('Should check if "New Alert Channel" Button is visble and disabled', async () => {
			const newAlertButton = screen.getByRole('button', {
				name: 'plus button_new_channel',
			});
			await waitFor(() => expect(newAlertButton).toBeInTheDocument());
			expect(newAlertButton).toBeDisabled();
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
		it('Should check if the table columns are properly displayed', async () => {
			expect(screen.getByText('column_channel_name')).toBeInTheDocument();
			expect(screen.getByText('column_channel_type')).toBeInTheDocument();
			expect(screen.queryByText('column_channel_action')).not.toBeInTheDocument();
		});

		it('Should check if the data in the table is displayed properly', async () => {
			expect(screen.getByText('Dummy-Channel')).toBeInTheDocument();
			expect(screen.getAllByText('slack')[0]).toBeInTheDocument();
			expect(screen.queryByText('column_channel_edit')).not.toBeInTheDocument();
			expect(screen.queryByText('Delete')).not.toBeInTheDocument();
		});
	});
});
