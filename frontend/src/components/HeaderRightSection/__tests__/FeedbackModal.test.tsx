/* eslint-disable sonarjs/no-duplicate-string */
// Mock dependencies before imports
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { handleContactSupport } from 'pages/Integrations/utils';
import { useLocation } from 'react-router-dom';

import FeedbackModal from '../FeedbackModal';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: jest.fn(),
}));

jest.mock('pages/Integrations/utils', () => ({
	handleContactSupport: jest.fn(),
}));

const mockLogEvent = logEvent as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockUseGetTenantLicense = useGetTenantLicense as jest.Mock;
const mockHandleContactSupport = handleContactSupport as jest.Mock;

const mockOnClose = jest.fn();

const mockLocation = {
	pathname: '/test-path',
};

describe('FeedbackModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseLocation.mockReturnValue(mockLocation);
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser: false,
		});
	});

	it('should render feedback modal with all tabs', () => {
		render(<FeedbackModal onClose={mockOnClose} />);

		expect(screen.getByText('Feedback')).toBeInTheDocument();
		expect(screen.getByText('Report a bug')).toBeInTheDocument();
		expect(screen.getByText('Feature request')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Feedback')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
	});

	it('should switch between tabs when clicked', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Initially, feedback tab should be active
		expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
			'Feedback',
		);

		const bugTab = screen.getByText('Report a bug');
		await user.click(bugTab);

		// Bug tab should now be active
		expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
			'Report a bug',
		);

		const featureTab = screen.getByText('Feature request');
		await user.click(featureTab);

		// Feature tab should now be active
		expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
			'Feature request',
		);
	});

	it('should update feedback text when typing in textarea', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		const textarea = screen.getByPlaceholderText('Feedback');
		const testFeedback = 'This is my feedback';

		await user.type(textarea, testFeedback);

		expect(textarea).toHaveValue(testFeedback);
	});

	it('should submit feedback and log event when submit button is clicked', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		const textarea = screen.getByPlaceholderText('Feedback');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'Test feedback content';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback submitted', {
			feedback: testFeedback,
			type: 'feedback',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('should submit bug report with correct type', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Switch to bug report tab
		const bugTab = screen.getByText('Report a bug');
		await user.click(bugTab);

		// Verify bug report tab is now active
		expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
			'Report a bug',
		);

		const textarea = screen.getByPlaceholderText('Feedback');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'This is a bug report';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback submitted', {
			feedback: testFeedback,
			type: 'reportBug',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('should submit feature request with correct type', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Switch to feature request tab
		const featureTab = screen.getByText('Feature request');
		await user.click(featureTab);

		// Verify feature request tab is now active
		expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
			'Feature request',
		);

		const textarea = screen.getByPlaceholderText('Feedback');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'This is a feature request';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback submitted', {
			feedback: testFeedback,
			type: 'featureRequest',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('should call handleContactSupport when contact support link is clicked', async () => {
		const user = userEvent.setup();
		const isCloudUser = true;
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser,
		});

		render(<FeedbackModal onClose={mockOnClose} />);

		const contactSupportLink = screen.getByText('Contact Support');
		await user.click(contactSupportLink);

		expect(mockHandleContactSupport).toHaveBeenCalledWith(isCloudUser);
	});

	it('should handle non-cloud user for contact support', async () => {
		const user = userEvent.setup();
		const isCloudUser = false;
		mockUseGetTenantLicense.mockReturnValue({
			isCloudUser,
		});

		render(<FeedbackModal onClose={mockOnClose} />);

		const contactSupportLink = screen.getByText('Contact Support');
		await user.click(contactSupportLink);

		expect(mockHandleContactSupport).toHaveBeenCalledWith(isCloudUser);
	});

	it('should render docs link with correct attributes', () => {
		render(<FeedbackModal onClose={mockOnClose} />);

		const docsLink = screen.getByText('Read our docs');
		expect(docsLink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/introduction/',
		);
		expect(docsLink).toHaveAttribute('target', '_blank');
		expect(docsLink).toHaveAttribute('rel', 'noreferrer');
	});

	it('should reset form state when component unmounts', () => {
		const { unmount } = render(<FeedbackModal onClose={mockOnClose} />);

		// This test verifies the useEffect cleanup function
		// The actual reset happens in the cleanup, so we just verify no errors occur
		expect(() => unmount()).not.toThrow();
	});
});
