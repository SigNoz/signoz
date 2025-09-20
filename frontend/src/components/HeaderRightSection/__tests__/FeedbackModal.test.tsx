/* eslint-disable sonarjs/no-duplicate-string */
// Mock dependencies before imports
import { toast } from '@signozhq/sonner';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { handleContactSupport } from 'pages/Integrations/utils';
import { useLocation } from 'react-router-dom';

import FeedbackModal from '../FeedbackModal';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn(),
}));

jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: jest.fn(),
}));

jest.mock('pages/Integrations/utils', () => ({
	handleContactSupport: jest.fn(),
}));

const mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;
const mockUseLocation = useLocation as jest.Mock;
const mockUseGetTenantLicense = useGetTenantLicense as jest.Mock;
const mockHandleContactSupport = handleContactSupport as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

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
		mockToast.success.mockClear();
		mockToast.error.mockClear();
	});

	it('should render feedback modal with all tabs', () => {
		render(<FeedbackModal onClose={mockOnClose} />);

		expect(screen.getByText('Feedback')).toBeInTheDocument();
		expect(screen.getByText('Report a bug')).toBeInTheDocument();
		expect(screen.getByText('Feature request')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Write your feedback here...'),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
	});

	it('should switch between tabs when clicked', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Initially, feedback radio should be active
		const feedbackRadio = screen.getByRole('radio', { name: 'Feedback' });
		expect(feedbackRadio).toBeChecked();

		const bugTab = screen.getByText('Report a bug');
		await user.click(bugTab);

		// Bug radio should now be active
		const bugRadio = screen.getByRole('radio', { name: 'Report a bug' });
		expect(bugRadio).toBeChecked();

		const featureTab = screen.getByText('Feature request');
		await user.click(featureTab);

		// Feature radio should now be active
		const featureRadio = screen.getByRole('radio', { name: 'Feature request' });
		expect(featureRadio).toBeChecked();
	});

	it('should update feedback text when typing in textarea', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		const textarea = screen.getByPlaceholderText('Write your feedback here...');
		const testFeedback = 'This is my feedback';

		await user.type(textarea, testFeedback);

		expect(textarea).toHaveValue(testFeedback);
	});

	it('should submit feedback and log event when submit button is clicked', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		const textarea = screen.getByPlaceholderText('Write your feedback here...');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'Test feedback content';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback: Submitted', {
			data: testFeedback,
			type: 'feedback',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
		expect(mockToast.success).toHaveBeenCalledWith(
			'Feedback submitted successfully',
			{
				position: 'top-right',
			},
		);
	});

	it('should submit bug report with correct type', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Switch to bug report tab
		const bugTab = screen.getByText('Report a bug');
		await user.click(bugTab);

		// Verify bug report radio is now active
		const bugRadio = screen.getByRole('radio', { name: 'Report a bug' });
		expect(bugRadio).toBeChecked();

		const textarea = screen.getByPlaceholderText('Write your feedback here...');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'This is a bug report';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback: Submitted', {
			data: testFeedback,
			type: 'reportBug',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
		expect(mockToast.success).toHaveBeenCalledWith(
			'Bug report submitted successfully',
			{
				position: 'top-right',
			},
		);
	});

	it('should submit feature request with correct type', async () => {
		const user = userEvent.setup();
		render(<FeedbackModal onClose={mockOnClose} />);

		// Switch to feature request tab
		const featureTab = screen.getByText('Feature request');
		await user.click(featureTab);

		// Verify feature request radio is now active
		const featureRadio = screen.getByRole('radio', { name: 'Feature request' });
		expect(featureRadio).toBeChecked();

		const textarea = screen.getByPlaceholderText('Write your feedback here...');
		const submitButton = screen.getByRole('button', { name: /submit/i });
		const testFeedback = 'This is a feature request';

		await user.type(textarea, testFeedback);
		await user.click(submitButton);

		expect(mockLogEvent).toHaveBeenCalledWith('Feedback: Submitted', {
			data: testFeedback,
			type: 'featureRequest',
			page: mockLocation.pathname,
		});
		expect(mockOnClose).toHaveBeenCalled();
		expect(mockToast.success).toHaveBeenCalledWith(
			'Feature request submitted successfully',
			{
				position: 'top-right',
			},
		);
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

	it('should reset form state when component unmounts', async () => {
		const user = userEvent.setup();

		// Render component
		const { unmount } = render(<FeedbackModal onClose={mockOnClose} />);

		// Change the form state first
		const textArea = screen.getByPlaceholderText('Write your feedback here...');
		await user.type(textArea, 'Some feedback text');

		// Change the active tab
		const bugTab = screen.getByText('Report a bug');
		await user.click(bugTab);

		// Verify state has changed
		expect(textArea).toHaveValue('Some feedback text');

		// Unmount the component - this should trigger cleanup
		unmount();

		// Re-render the component to verify state was reset
		render(<FeedbackModal onClose={mockOnClose} />);

		// Verify form state is reset
		const newTextArea = screen.getByPlaceholderText(
			'Write your feedback here...',
		);
		expect(newTextArea).toHaveValue(''); // Should be empty

		// Verify active radio is reset to default (Feedback radio)
		const feedbackRadio = screen.getByRole('radio', { name: 'Feedback' });
		expect(feedbackRadio).toBeChecked();
	});
});
