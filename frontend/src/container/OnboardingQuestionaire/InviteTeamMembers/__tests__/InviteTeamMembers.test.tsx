import logEvent from 'api/common/logEvent';
import { render, screen, userEvent } from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

const mockNotificationSuccess = jest.fn();
const mockNotificationWarning = jest.fn();

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			success: mockNotificationSuccess,
			warning: mockNotificationWarning,
		},
	}),
}));

jest.mock('api/common/logEvent', () => jest.fn());

interface MockInviteMembersProps {
	onSuccess: () => void;
	onPartialSuccess: () => void;
	onAllFailed: () => void;
	showHeader: boolean;
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

const mockOnNext = jest.fn();

function renderComponent({
	isLoading = false,
}: { isLoading?: boolean } = {}): ReturnType<typeof render> {
	return render(<InviteTeamMembers isLoading={isLoading} onNext={mockOnNext} />);
}

describe('InviteTeamMembers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		mockInviteMembersProps = null;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('rendering', () => {
		it('renders header and InviteMembers component', () => {
			renderComponent();

			expect(
				screen.getByRole('heading', { name: /invite your team/i }),
			).toBeInTheDocument();
			expect(
				screen.getByText(/signoz is a lot more useful with collaborators/i),
			).toBeInTheDocument();
			expect(screen.getByTestId('mock-invite-members')).toBeInTheDocument();
		});

		it('passes showHeader=true to InviteMembers', () => {
			renderComponent();

			expect(mockInviteMembersProps?.showHeader).toBe(true);
		});
	});

	describe('footer buttons', () => {
		it('renders Send Invites and Do Later buttons', () => {
			renderComponent();

			expect(
				screen.getByRole('button', { name: /send invites/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /i'll do this later/i }),
			).toBeInTheDocument();
		});

		it('disables buttons when isLoading=true', () => {
			renderComponent({ isLoading: true });

			expect(screen.getByRole('button', { name: /send invites/i })).toBeDisabled();
			expect(
				screen.getByRole('button', { name: /i'll do this later/i }),
			).toBeDisabled();
		});

		it('disables Send Invites when canSubmit=false from InviteMembers', () => {
			const { unmount } = renderComponent();
			unmount();

			const { getByTestId } = render(
				mockInviteMembersProps?.renderFooter({
					submit: jest.fn(),
					canSubmit: false,
					isSubmitting: false,
				}) as JSX.Element,
			);

			expect(getByTestId('send-invites-button')).toBeDisabled();
			expect(getByTestId('do-later-button')).not.toBeDisabled();
		});

		it('disables buttons when isSubmitting=true from InviteMembers', () => {
			const { unmount } = renderComponent();
			unmount();

			const { getByTestId } = render(
				mockInviteMembersProps?.renderFooter({
					submit: jest.fn(),
					canSubmit: true,
					isSubmitting: true,
				}) as JSX.Element,
			);

			expect(getByTestId('send-invites-button')).toBeDisabled();
			expect(getByTestId('do-later-button')).toBeDisabled();
		});
	});

	describe('handleSuccess callback', () => {
		it('logs event, shows success notification, and calls onNext after delay', () => {
			renderComponent();

			mockInviteMembersProps?.onSuccess();

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Success',
				{},
			);
			expect(mockNotificationSuccess).toHaveBeenCalledWith({
				message: 'Invites sent successfully!',
			});

			expect(mockOnNext).not.toHaveBeenCalled();
			jest.advanceTimersByTime(1000);
			expect(mockOnNext).toHaveBeenCalledTimes(1);
		});
	});

	describe('handlePartialSuccess callback', () => {
		it('logs event and shows warning notification', () => {
			renderComponent();

			mockInviteMembersProps?.onPartialSuccess();

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Partial Success',
				{},
			);
			expect(mockNotificationWarning).toHaveBeenCalledWith({
				message: 'Some invites failed. Check the errors above.',
			});
		});
	});

	describe('handleAllFailed callback', () => {
		it('logs event', () => {
			renderComponent();

			mockInviteMembersProps?.onAllFailed();

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Failed',
				{},
			);
		});
	});

	describe('handleDoLater', () => {
		it('logs event and calls onNext immediately', async () => {
			const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
			renderComponent();

			await user.click(
				screen.getByRole('button', { name: /i'll do this later/i }),
			);

			expect(logEvent).toHaveBeenCalledWith('Org Onboarding: Clicked Do Later', {
				currentPageID: 4,
			});
			expect(mockOnNext).toHaveBeenCalledTimes(1);
		});
	});
});
