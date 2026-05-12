// Mock dependencies before imports
import { useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

import HeaderRightSection from '../HeaderRightSection';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
}));

jest.mock('../FeedbackModal', () => ({
	__esModule: true,
	default: ({ onClose }: { onClose: () => void }): JSX.Element => (
		<div data-testid="feedback-modal">
			<button onClick={onClose} type="button">
				Close Feedback
			</button>
		</div>
	),
}));

jest.mock('../ShareURLModal', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="share-modal">Share URL Modal</div>
	),
}));

jest.mock('../AnnouncementsModal', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="announcements-modal">Announcements Modal</div>
	),
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: jest.fn(),
}));

const mockLogEvent = logEvent as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockUseGetTenantLicense = useGetTenantLicense as jest.Mock;

const defaultProps = {
	enableAnnouncements: true,
	enableShare: true,
	enableFeedback: true,
};

const mockLocation = {
	pathname: '/test-path',
};

describe('HeaderRightSection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseLocation.mockReturnValue(mockLocation);
		// Default to licensed user (Enterprise or Cloud)
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: true,
			isEnterpriseSelfHostedUser: false,
			isCommunityUser: false,
			isCommunityEnterpriseUser: false,
		});
	});

	it('should render all buttons when all features are enabled', () => {
		render(<HeaderRightSection {...defaultProps} />);

		const buttons = screen.getAllByRole('button');
		expect(buttons).toHaveLength(3);
		expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();

		expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /announcements/i }),
		).toBeInTheDocument();
	});

	it('should render only enabled features', () => {
		render(
			<HeaderRightSection
				enableAnnouncements={false}
				enableShare={false}
				enableFeedback
			/>,
		);

		const buttons = screen.getAllByRole('button');
		expect(buttons).toHaveLength(1);
		expect(
			screen.queryByRole('button', { name: /share/i }),
		).not.toBeInTheDocument();

		expect(
			screen.queryByRole('button', { name: /announcements/i }),
		).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument();
	});

	it('should open feedback modal and log event when feedback button is clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = screen.getByRole('button', { name: /feedback/i });
		expect(feedbackButton).toBeInTheDocument();

		await user.click(feedbackButton!);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback: Clicked', {
			page: mockLocation.pathname,
		});
		expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
	});

	it('should open share modal and log event when share button is clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		const shareButton = screen.getByRole('button', { name: /share/i });
		await user.click(shareButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Share: Clicked', {
			page: mockLocation.pathname,
		});
		expect(screen.getByTestId('share-modal')).toBeInTheDocument();
	});

	it('should log event when announcements button is clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		const announcementsButton = screen.getByRole('button', {
			name: /announcements/i,
		});
		expect(announcementsButton).toBeInTheDocument();

		await user.click(announcementsButton!);

		expect(mockLogEvent).toHaveBeenCalledWith('Announcements: Clicked', {
			page: mockLocation.pathname,
		});
	});

	it('should close feedback modal when onClose is called', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		// Open feedback modal
		const feedbackButton = screen.getByRole('button', { name: /feedback/i });
		expect(feedbackButton).toBeInTheDocument();

		await user.click(feedbackButton!);
		expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();

		// Close feedback modal
		const closeFeedbackButton = screen.getByText('Close Feedback');
		await user.click(closeFeedbackButton);
		expect(screen.queryByTestId('feedback-modal')).not.toBeInTheDocument();
	});

	it('should close other modals when opening feedback modal', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		// Open share modal first
		const shareButton = screen.getByRole('button', { name: /share/i });
		await user.click(shareButton);
		expect(screen.getByTestId('share-modal')).toBeInTheDocument();

		// Open feedback modal - should close share modal
		const feedbackButton = screen.getByRole('button', { name: /feedback/i });
		expect(feedbackButton).toBeInTheDocument();

		await user.click(feedbackButton!);
		expect(screen.getByTestId('feedback-modal')).toBeInTheDocument();
		expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
	});

	it('should show feedback button for Cloud users when feedback is enabled', () => {
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: true,
			isEnterpriseSelfHostedUser: false,
			isCommunityUser: false,
			isCommunityEnterpriseUser: false,
		});

		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = screen.queryByRole('button', { name: /feedback/i });
		expect(feedbackButton).toBeInTheDocument();
	});

	it('should show feedback button for Enterprise self-hosted users when feedback is enabled', () => {
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: false,
			isEnterpriseSelfHostedUser: true,
			isCommunityUser: false,
			isCommunityEnterpriseUser: false,
		});

		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = screen.queryByRole('button', { name: /feedback/i });
		expect(feedbackButton).toBeInTheDocument();
	});

	it('should hide feedback button for Community users even when feedback is enabled', () => {
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: false,
			isEnterpriseSelfHostedUser: false,
			isCommunityUser: true,
			isCommunityEnterpriseUser: false,
		});

		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = screen.queryByRole('button', { name: /feedback/i });
		expect(feedbackButton).not.toBeInTheDocument();
	});

	it('should hide feedback button for Community Enterprise users even when feedback is enabled', () => {
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: false,
			isEnterpriseSelfHostedUser: false,
			isCommunityUser: false,
			isCommunityEnterpriseUser: true,
		});

		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = screen.queryByRole('button', { name: /feedback/i });
		expect(feedbackButton).not.toBeInTheDocument();
	});

	it('should render correct number of buttons when feedback is hidden due to license', () => {
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: false,
			isEnterpriseSelfHostedUser: false,
			isCommunityUser: true,
			isCommunityEnterpriseUser: false,
		});

		render(<HeaderRightSection {...defaultProps} />);

		// Should have 2 buttons (announcements + share) instead of 3
		const buttons = screen.getAllByRole('button');
		expect(buttons).toHaveLength(2);

		// Verify which buttons are present
		expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /announcements/i }),
		).toBeInTheDocument();

		// Verify feedback button is not present
		expect(
			screen.queryByRole('button', { name: /feedback/i }),
		).not.toBeInTheDocument();
	});
});
