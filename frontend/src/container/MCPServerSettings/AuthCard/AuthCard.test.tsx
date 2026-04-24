import { render, screen, userEvent } from 'tests/test-utils';

import AuthCard from './AuthCard';

const mockOnCopyInstanceUrl = jest.fn();
const mockOnCreateServiceAccount = jest.fn();

const defaultProps = {
	instanceUrl: 'http://localhost',
	onCopyInstanceUrl: mockOnCopyInstanceUrl,
	onCreateServiceAccount: mockOnCreateServiceAccount,
};

describe('AuthCard', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders the instance URL', () => {
		render(<AuthCard {...defaultProps} isAdmin />);

		expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
			'http://localhost',
		);
	});

	it('shows Create Service Account button for admin', () => {
		render(<AuthCard {...defaultProps} isAdmin />);

		expect(screen.getByText('step2_admin_cta')).toBeInTheDocument();
		expect(screen.queryByText('step2_viewer_helper')).not.toBeInTheDocument();
	});

	it('shows info banner for non-admin', () => {
		render(<AuthCard {...defaultProps} isAdmin={false} />);

		expect(screen.getByText('step2_viewer_helper')).toBeInTheDocument();
		expect(screen.queryByText('step2_admin_cta')).not.toBeInTheDocument();
	});

	it('calls onCopyInstanceUrl when copy button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<AuthCard {...defaultProps} isAdmin />);

		await user.click(
			screen.getByRole('button', { name: 'copy_aria_instance_url' }),
		);

		expect(mockOnCopyInstanceUrl).toHaveBeenCalledTimes(1);
	});

	it('calls onCreateServiceAccount when admin clicks the CTA', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<AuthCard {...defaultProps} isAdmin />);

		await user.click(screen.getByText('step2_admin_cta'));

		expect(mockOnCreateServiceAccount).toHaveBeenCalledTimes(1);
	});
});
