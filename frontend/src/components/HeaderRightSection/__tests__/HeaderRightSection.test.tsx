/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable react/jsx-props-no-spreading */
// Mock dependencies before imports
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useLocation } from 'react-router-dom';

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

		// Check for feedback button by class
		const feedbackButton = document.querySelector(
			'.share-feedback-btn[class*="share-feedback-btn"]',
		);
		expect(feedbackButton).toBeInTheDocument();

		// Check for announcements button by finding the inbox icon
		const inboxIcon = document.querySelector('.lucide-inbox');
		expect(inboxIcon).toBeInTheDocument();
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

		// Check that inbox icon is not present
		const inboxIcon = document.querySelector('.lucide-inbox');
		expect(inboxIcon).not.toBeInTheDocument();

		// Check that feedback button is present
		const squarePenIcon = document.querySelector('.lucide-square-pen');
		expect(squarePenIcon).toBeInTheDocument();
	});

	it('should open feedback modal and log event when feedback button is clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderRightSection {...defaultProps} />);

		const feedbackButton = document
			.querySelector('.lucide-square-pen')
			?.closest('button');
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

		const announcementsButton = document
			.querySelector('.lucide-inbox')
			?.closest('button');
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
		const feedbackButton = document
			.querySelector('.lucide-square-pen')
			?.closest('button');
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
		const feedbackButton = document
			.querySelector('.lucide-square-pen')
			?.closest('button');
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

		const feedbackButton = document.querySelector('.lucide-square-pen');
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

		const feedbackButton = document.querySelector('.lucide-square-pen');
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

		const feedbackButton = document.querySelector('.lucide-square-pen');
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

		const feedbackButton = document.querySelector('.lucide-square-pen');
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
		const inboxIcon = document.querySelector('.lucide-inbox');
		expect(inboxIcon).toBeInTheDocument();

		// Verify feedback button is not present
		const feedbackIcon = document.querySelector('.lucide-square-pen');
		expect(feedbackIcon).not.toBeInTheDocument();
	});
});
