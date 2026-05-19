import { Form } from 'antd';
import InviteUserModal from 'container/OrganizationSettings/InviteUserModal/InviteUserModal';
import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			error: jest.fn(),
			success: jest.fn(),
		},
	}),
}));

jest.mock('api/v1/invite/create', () => ({
	__esModule: true,
	default: jest.fn(),
}));

function TestWrapper(): JSX.Element {
	const [form] = Form.useForm();
	return (
		<InviteUserModal
			isInviteTeamMemberModalOpen
			toggleModal={jest.fn()}
			form={form}
			onClose={jest.fn()}
		/>
	);
}

describe('InviteUserModal — no-auth mode', () => {
	it('renders no-auth guard wrapper for the invite submit button', () => {
		renderWithNoAuth(<TestWrapper />);
		expect(screen.getByTestId('no-auth-invite-user')).toBeInTheDocument();
	});
});
