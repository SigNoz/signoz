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

	it('shows URL for non-admin (all roles can fetch instance URL)', () => {
		render(<AuthCard {...defaultProps} isAdmin={false} />);

		expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
			'http://localhost',
		);
	});

	describe('isLoadingInstanceUrl', () => {
		it('shows a skeleton and hides the URL while loading', () => {
			render(<AuthCard {...defaultProps} isAdmin isLoadingInstanceUrl />);

			expect(screen.queryByTestId('mcp-instance-url')).not.toBeInTheDocument();
			expect(document.querySelector('.ant-skeleton-input')).toBeInTheDocument();
		});

		it('does not render the copy button while loading', () => {
			render(<AuthCard {...defaultProps} isAdmin isLoadingInstanceUrl />);

			expect(
				screen.queryByRole('button', { name: 'Copy SigNoz instance URL' }),
			).not.toBeInTheDocument();
		});

		it('shows the URL and copy button once loading is done', () => {
			render(<AuthCard {...defaultProps} isAdmin isLoadingInstanceUrl={false} />);

			expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
				'http://localhost',
			);
			expect(
				screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
			).toBeInTheDocument();
		});
	});
});
