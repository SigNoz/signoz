import { toast } from '@signozhq/ui/sonner';
import { render, screen, userEvent } from 'tests/test-utils';

import InviteMembersModal from '../InviteMembersModal';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: jest.fn(),
		warning: jest.fn(),
	},
}));

interface MockInviteMembersProps {
	onSuccess: () => void;
	onPartialSuccess: () => void;
	onAllFailed?: () => void;
	renderFooter: (props: {
		submit: () => void;
		canSubmit: boolean;
		isSubmitting: boolean;
	}) => JSX.Element;
}

let mockInviteMembersProps: MockInviteMembersProps | null = null;

jest.mock('components/InviteMembers/InviteMembers', () => {
	return function MockInviteMembers(props: MockInviteMembersProps): JSX.Element {
		mockInviteMembersProps = props;
		return (
			<div data-testid="mock-invite-members">
				{props.renderFooter({
					submit: jest.fn(),
					canSubmit: true,
					isSubmitting: false,
				})}
			</div>
		);
	};
});

const defaultProps = {
	open: true,
	onClose: jest.fn(),
	onComplete: jest.fn(),
};

function renderComponent(
	props: Partial<typeof defaultProps> = {},
): ReturnType<typeof render> {
	return render(<InviteMembersModal {...defaultProps} {...props} />);
}

describe('InviteMembersModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInviteMembersProps = null;
	});

	describe('rendering', () => {
		it('renders modal with title and InviteMembers component', () => {
			renderComponent();

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
				'Invite Team Members',
			);
			expect(screen.getByTestId('mock-invite-members')).toBeInTheDocument();
		});

		it('does not render when open=false', () => {
			renderComponent({ open: false });

			expect(screen.queryByText('Invite Team Members')).not.toBeInTheDocument();
		});
	});

	describe('footer buttons', () => {
		it('renders Cancel and Invite buttons', () => {
			renderComponent();

			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /invite team members/i }),
			).toBeInTheDocument();
		});

		it('disables Invite button when canSubmit=false', () => {
			const { unmount } = renderComponent();
			unmount();

			const { getByRole } = render(
				mockInviteMembersProps?.renderFooter({
					submit: jest.fn(),
					canSubmit: false,
					isSubmitting: false,
				}) as JSX.Element,
			);

			expect(getByRole('button', { name: /invite team members/i })).toBeDisabled();
		});

		it('shows loading state when isSubmitting=true', () => {
			const { unmount } = renderComponent();
			unmount();

			const { getByRole } = render(
				mockInviteMembersProps?.renderFooter({
					submit: jest.fn(),
					canSubmit: true,
					isSubmitting: true,
				}) as JSX.Element,
			);

			expect(getByRole('button', { name: /inviting/i })).toBeInTheDocument();
		});

		it('calls onClose when Cancel is clicked', async () => {
			const user = userEvent.setup();
			const onClose = jest.fn();
			renderComponent({ onClose });

			await user.click(screen.getByRole('button', { name: /cancel/i }));

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it('calls submit when Invite button is clicked', async () => {
			const user = userEvent.setup();
			const mockSubmit = jest.fn();

			const { unmount } = renderComponent();
			unmount();

			const { getByRole } = render(
				mockInviteMembersProps?.renderFooter({
					submit: mockSubmit,
					canSubmit: true,
					isSubmitting: false,
				}) as JSX.Element,
			);

			await user.click(getByRole('button', { name: /invite team members/i }));

			expect(mockSubmit).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleSuccess callback', () => {
		it('shows success toast, calls onClose and onComplete', () => {
			const onClose = jest.fn();
			const onComplete = jest.fn();
			renderComponent({ onClose, onComplete });

			mockInviteMembersProps?.onSuccess();

			expect(toast.success).toHaveBeenCalledWith('Invites sent successfully', {
				position: 'top-right',
			});
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(onComplete).toHaveBeenCalledTimes(1);
		});

		it('works without onComplete prop', () => {
			const onClose = jest.fn();
			renderComponent({ onClose, onComplete: undefined });

			mockInviteMembersProps?.onSuccess();

			expect(toast.success).toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe('handlePartialSuccess callback', () => {
		it('shows warning toast and calls onComplete', () => {
			const onComplete = jest.fn();
			renderComponent({ onComplete });

			mockInviteMembersProps?.onPartialSuccess();

			expect(toast.warning).toHaveBeenCalledWith('Some invites failed', {
				position: 'top-right',
			});
			expect(onComplete).toHaveBeenCalledTimes(1);
		});

		it('does not call onClose on partial success', () => {
			const onClose = jest.fn();
			renderComponent({ onClose });

			mockInviteMembersProps?.onPartialSuccess();

			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe('dialog close behavior', () => {
		it('calls onClose when dialog is closed via close button', async () => {
			const user = userEvent.setup();
			const onClose = jest.fn();
			renderComponent({ onClose });

			const closeButton = screen.getByRole('button', { name: /close/i });
			await user.click(closeButton);

			expect(onClose).toHaveBeenCalled();
		});
	});
});
