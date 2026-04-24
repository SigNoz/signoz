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

		expect(screen.getByText('Create service account')).toBeInTheDocument();
		expect(
			screen.queryByText(
				'Only admins can create API keys. Ask your workspace admin for a key with read access, then paste it into the API Key field.',
			),
		).not.toBeInTheDocument();
	});

	it('shows info banner for non-admin', () => {
		render(<AuthCard {...defaultProps} isAdmin={false} />);

		expect(
			screen.getByText(
				'Only admins can create API keys. Ask your workspace admin for a key with read access, then paste it into the API Key field.',
			),
		).toBeInTheDocument();
		expect(screen.queryByText('Create service account')).not.toBeInTheDocument();
	});

	it('calls onCopyInstanceUrl when copy button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<AuthCard {...defaultProps} isAdmin />);

		await user.click(
			screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
		);

		expect(mockOnCopyInstanceUrl).toHaveBeenCalledTimes(1);
	});

	it('calls onCreateServiceAccount when admin clicks the CTA', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<AuthCard {...defaultProps} isAdmin />);

		await user.click(screen.getByText('Create service account'));

		expect(mockOnCreateServiceAccount).toHaveBeenCalledTimes(1);
	});
});
