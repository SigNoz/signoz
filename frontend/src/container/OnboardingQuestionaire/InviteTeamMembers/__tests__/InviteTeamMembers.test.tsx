import {
	InviteMemberRow,
	InviteMembersProps,
	InviteResult,
} from 'components/InviteMembers/types';
import logEvent from 'api/common/logEvent';
import { render, screen, userEvent } from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

const mockNotificationSuccess = vi.fn();
const mockNotificationWarning = vi.fn();

vi.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			success: mockNotificationSuccess,
			warning: mockNotificationWarning,
		},
	}),
}));

vi.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('components/RolesSelect/RolesSelect', () => ({
	useRoles: (): any => ({
		roles: [
			{ id: 'role-viewer-id', name: 'VIEWER' },
			{ id: 'role-editor-id', name: 'EDITOR' },
			{ id: 'role-admin-id', name: 'ADMIN' },
		],
		isLoading: false,
		isError: false,
		error: undefined,
		refetch: vi.fn(),
	}),
}));

vi.mock('utils/basePath', async () => ({
	...(await vi.importActual<typeof import('utils/basePath')>('utils/basePath')),
	getBaseUrl: (): string => 'http://localhost:3301',
}));

let mockInviteMembersProps: InviteMembersProps | null = null;

vi.mock('components/InviteMembers/InviteMembers', () => {
	function MockInviteMembers(props: InviteMembersProps): JSX.Element {
		mockInviteMembersProps = props;
		return (
			<div data-testid="mock-invite-members">
				{props.renderFooter?.({
					submit: vi.fn().mockResolvedValue([]),
					reset: vi.fn(),
					canSubmit: true,
					isSubmitting: false,
					touchedCount: 0,
				})}
			</div>
		);
	}
	return {
		__esModule: true,
		default: MockInviteMembers,
	};
});

const mockOnNext = vi.fn();

function renderComponent({
	isLoading = false,
}: { isLoading?: boolean } = {}): ReturnType<typeof render> {
	return render(<InviteTeamMembers isLoading={isLoading} onNext={mockOnNext} />);
}

describe('InviteTeamMembers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockInviteMembersProps = null;
	});

	afterEach(() => {
		vi.useRealTimers();
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
				mockInviteMembersProps?.renderFooter?.({
					submit: vi.fn().mockResolvedValue([]),
					reset: vi.fn(),
					canSubmit: false,
					isSubmitting: false,
					touchedCount: 0,
				}) as JSX.Element,
			);

			expect(getByTestId('send-invites-button')).toBeDisabled();
			expect(getByTestId('do-later-button')).not.toBeDisabled();
		});

		it('disables buttons when isSubmitting=true from InviteMembers', () => {
			const { unmount } = renderComponent();
			unmount();

			const { getByTestId } = render(
				mockInviteMembersProps?.renderFooter?.({
					submit: vi.fn().mockResolvedValue([]),
					reset: vi.fn(),
					canSubmit: true,
					isSubmitting: true,
					touchedCount: 0,
				}) as JSX.Element,
			);

			expect(getByTestId('send-invites-button')).toBeDisabled();
			expect(getByTestId('do-later-button')).toBeDisabled();
		});
	});

	describe('handleSuccess callback', () => {
		it('logs event with teamMembers in correct shape, shows success notification, and calls onNext after delay', () => {
			renderComponent();

			const mockResults: InviteResult[] = [
				{ email: 'user1@test.com', success: true },
				{ email: 'user2@test.com', success: true },
			];
			const mockRows: InviteMemberRow[] = [
				{ id: 'row-1', email: 'user1@test.com', roleIds: ['role-viewer-id'] },
				{ id: 'row-2', email: 'user2@test.com', roleIds: ['role-editor-id'] },
			];
			mockInviteMembersProps?.onSuccess?.(mockResults, mockRows);

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Success',
				{
					teamMembers: [
						{
							email: 'user1@test.com',
							roles: ['VIEWER'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-1',
						},
						{
							email: 'user2@test.com',
							roles: ['EDITOR'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-2',
						},
					],
				},
			);
			expect(mockNotificationSuccess).toHaveBeenCalledWith({
				message: 'Invites sent successfully!',
			});

			expect(mockOnNext).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1000);
			expect(mockOnNext).toHaveBeenCalledTimes(1);
		});
	});

	describe('handlePartialSuccess callback', () => {
		it('logs event with teamMembers in correct shape and shows warning notification', () => {
			renderComponent();

			const mockResults: InviteResult[] = [
				{ email: 'user1@test.com', success: true },
				{ email: 'user2@test.com', success: false, error: 'Already exists' },
			];
			const mockRows: InviteMemberRow[] = [
				{ id: 'row-1', email: 'user1@test.com', roleIds: ['role-viewer-id'] },
				{ id: 'row-2', email: 'user2@test.com', roleIds: ['role-admin-id'] },
			];
			mockInviteMembersProps?.onPartialSuccess?.(mockResults, mockRows);

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Partial Success',
				{
					teamMembers: [
						{
							email: 'user1@test.com',
							roles: ['VIEWER'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-1',
						},
						{
							email: 'user2@test.com',
							roles: ['ADMIN'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-2',
						},
					],
				},
			);
			expect(mockNotificationWarning).toHaveBeenCalledWith({
				message: 'Some invites failed. Check the errors above.',
			});
		});
	});

	describe('handleAllFailed callback', () => {
		it('logs event with teamMembers in correct shape', () => {
			renderComponent();

			const mockResults: InviteResult[] = [
				{ email: 'user1@test.com', success: false, error: 'Error 1' },
				{ email: 'user2@test.com', success: false, error: 'Error 2' },
			];
			const mockRows: InviteMemberRow[] = [
				{ id: 'row-1', email: 'user1@test.com', roleIds: ['role-editor-id'] },
				{ id: 'row-2', email: 'user2@test.com', roleIds: ['role-viewer-id'] },
			];
			mockInviteMembersProps?.onAllFailed?.(mockResults, mockRows);

			expect(logEvent).toHaveBeenCalledWith(
				'Org Onboarding: Invite Team Members Failed',
				{
					teamMembers: [
						{
							email: 'user1@test.com',
							roles: ['EDITOR'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-1',
						},
						{
							email: 'user2@test.com',
							roles: ['VIEWER'],
							name: '',
							frontendBaseUrl: 'http://localhost:3301',
							id: 'row-2',
						},
					],
				},
			);
		});
	});

	describe('handleDoLater', () => {
		it('logs event and calls onNext immediately', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
