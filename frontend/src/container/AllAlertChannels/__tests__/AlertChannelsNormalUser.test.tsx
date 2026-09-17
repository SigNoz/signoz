import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

const { successNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
}));
vi.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: vi.fn(() => ({
		notifications: {
			success: successNotification,
			error: vi.fn(),
		},
	})),
}));

vi.mock('hooks/useComponentPermission', () => ({
	__esModule: true,
	default: vi.fn().mockImplementation(() => [false]),
}));

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.ALL_CHANNELS}`,
	}),
}));

describe('Alert Channels Settings List page (Normal User)', () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		render(<AlertChannels />);
		await waitFor(() =>
			expect(screen.getByText('sending_channels_note')).toBeInTheDocument(),
		);
		// ResizeTable populates its columns in an effect after the data commit,
		// so wait for the settled table before the sync assertions below.
		await screen.findByText('column_channel_name');
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});
	describe('Should display the Alert Channels page properly', () => {
		it('Should check if "The alerts will be sent to all the configured channels." is visible', async () => {
			await waitFor(() =>
				expect(screen.getByText('sending_channels_note')).toBeInTheDocument(),
			);
		});

		it('Should check if "New Alert Channel" Button is visble and disabled', async () => {
			const newAlertButton = screen.getByRole('button', {
				name: /button_new_channel/i,
			});
			await waitFor(() => expect(newAlertButton).toBeInTheDocument());
			expect(newAlertButton).toBeDisabled();
		});
		it('Should check if the help icon is visible and displays "tooltip_notification_channels', async () => {
			const helpIcon = screen.getByRole('img', { name: /help/i });
			fireEvent.mouseOver(helpIcon);
			// antd Tooltip shows after a hover delay driven by setTimeout,
			// which stays frozen while fake timers are enabled.
			vi.advanceTimersByTime(1000);

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
