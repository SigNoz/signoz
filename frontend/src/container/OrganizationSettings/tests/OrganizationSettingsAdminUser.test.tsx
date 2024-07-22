import dayjs from 'dayjs';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';

import OrganizationSettings from '..';

jest.useFakeTimers();

jest.mock('antd/es/form/Form', () => ({
	useForm: jest.fn().mockReturnValue({
		onFinish: jest.fn(),
	}),
}));

const successNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: jest.fn(),
		},
	})),
}));

jest.mock('hooks/useFeatureFlag', () => ({
	useIsFeatureDisabled: jest.fn(() => false),
}));

const inviteUser: { [key: string]: string | number }[] = [
	{
		key: 1715741587,
		name: 'Jane',
		// eslint-disable-next-line sonarjs/no-duplicate-string
		email: 'jane@doe.com',
		accessLevel: 'VIEWER',
		inviteLink:
			'http://localhost:3301/signup?token=fa1f85040480aea0f7055dc17165594a',
	},
];

const memberUser: { [key: string]: string | number }[] = [
	{
		accessLevel: 'VIEWER',
		email: 'jane@doe.com',
		id: '32232512-2233-4d3d-ae4d-361947bcf19c',
		joinedOn: '1666357530',
		name: 'Jane',
	},
];

// const inviteUsersResponse = {
// 	status: 'success',
// 	data: {
// 		statusCode: 200,
// 		error: null,
// 		payload: [
// 			{
// 				email: 'jane@doe.com',
// 				name: 'Jane',
// 				token: 'testtoken',
// 				createdAt: 1715741587,
// 				role: 'VIEWER',
// 				organization: 'test',
// 			},
// 			{
// 				email: 'test+in@singoz.io',
// 				name: '',
// 				token: 'testtoken1',
// 				createdAt: 1720095913,
// 				role: 'VIEWER',
// 				organization: 'test',
// 			},
// 		],
// 	},
// };

// jest.mock('react-query', () => ({
// 	...jest.requireActual('react-query'),
// 	useQuery: jest.fn(async () => Promise.resolve(inviteUsersResponse)),
// }));

describe('Organization Settings Page', () => {
	let displayNameLabel: HTMLElement;
	let displayNameInput: HTMLElement;
	let displayNameSubmitButton: HTMLElement;

	beforeEach(() => {
		server.use(
			rest.get('http://localhost/api/v1/invite', (_, res, ctx) =>
				res(ctx.status(200), ctx.json(inviteUser)),
			),
			rest.get('http://localhost/api/v1/orgUsers/:id', (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json([
						{
							key: 1715741587,
							name: 'Jane',
							email: 'jane@doe.com',
							accessLevel: 'VIEWER',
							inviteLink:
								'http://localhost:3301/signup?token=fa1f85040480aea0f7055dc17165594a',
						},
					]),
				),
			),
			rest.get(
				'http://localhost/api/v1/getResetPasswordToken/:id',
				(_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							userId: '32232512-3322-5f3d-ae4d-361947324f19c',
							token: '2a05d2b240da25c6f7a400bd3529c318',
						}),
					),
			),
		);

		render(<OrganizationSettings />);
		displayNameLabel = screen.getByText(/display name/i);
		displayNameInput = screen.getByRole('textbox', {
			name: /display name/i,
		});
		displayNameSubmitButton = screen.getByRole('button', {
			name: /submit/i,
		});
	});
	it('should render the display name form properly', () => {
		expect(displayNameLabel).toBeInTheDocument();

		expect(displayNameInput).toBeInTheDocument();

		expect(displayNameInput).toBeRequired();

		expect(displayNameSubmitButton).toBeInTheDocument();
	});

	it('Should check if the submit button is disabled by default', () => {
		expect(displayNameSubmitButton).toBeDisabled();
	});

	it('Should check if the submit button gets enabled on typing Signoz', async () => {
		act(() => {
			fireEvent.change(displayNameInput, {
				target: { value: 'Signoz' },
			});
		});

		expect(
			await screen.findByRole('button', {
				name: /submit/i,
			}),
		).toBeEnabled();
	});

	it('Should check if the submit button is disabled and validation message "Missing Display name" is displayed when the textbox is left empty', async () => {
		act(() => {
			fireEvent.change(displayNameInput, {
				target: { value: '' },
			});
		});

		expect(
			await screen.findByRole('button', {
				name: /submit/i,
			}),
		).toBeDisabled();

		expect(await screen.findByText('Missing Display name')).toBeInTheDocument();
	});

	describe('Invites Section', () => {
		it('Should display the pending invites title', () => {
			expect(screen.getByText('pending_invites')).toBeInTheDocument();
		});
		it('Should display the "+Invite Members" button', () => {
			expect(screen.getByText('invite_members')).toBeInTheDocument();
		});
		describe('Invite Modal', () => {
			let inviteModal: HTMLElement;
			beforeEach(async () => {
				const inviteMembersButton = screen.getByText('invite_members');
				act(() => {
					fireEvent.click(inviteMembersButton);
				});
				inviteModal = await screen.findByTestId('invite-team-members-modal');
			});

			it('Should Check if the Invite members modal is properly displayed', async () => {
				expect(inviteModal).toBeInTheDocument();
			});
			it('Should check if the modal title is "Invite team members"', async () => {
				const inviteModalTitle = await within(inviteModal).findAllByText(
					'invite_team_members',
				);
				expect(inviteModalTitle[0]).toBeInTheDocument();
			});
			describe('Should check if the modal body contains ', () => {
				it('email label and input', () => {
					// Verify that the invite modal contains a label and input field for entering the email address
					const emailLabel = within(inviteModal).getByText('email_address');
					expect(emailLabel).toBeInTheDocument();

					const emailInput = within(inviteModal).getByPlaceholderText(
						'email_placeholder',
					);
					expect(emailInput).toBeInTheDocument();
				});

				it('name label and input', () => {
					// Verify that the invite modal contains label and input for entering name
					const nameLabel = within(inviteModal).getByText('name_optional');
					expect(nameLabel).toBeInTheDocument();

					const nameInput = within(inviteModal).getByPlaceholderText(
						'name_placeholder',
					);
					expect(nameInput).toBeInTheDocument();
				});

				it('role label and dropdown', () => {
					const roleLabel = within(inviteModal).getByText('role');
					expect(roleLabel).toBeInTheDocument();
					const roleDropdown = within(inviteModal).getByTestId('role-select');
					expect(roleDropdown).toBeInTheDocument();
				});

				it('submit button', () => {
					// Verify that the invite modal contains a button for sending the invitation
					const sendButton = within(inviteModal).getByTestId(
						'invite-team-members-button',
					);
					expect(sendButton).toBeInTheDocument();
				});
			});
			it('Should check if "Add another team member" adds another row of text boxes', () => {
				const addAnotherTeamMemberButton = within(inviteModal).getByText(
					'add_another_team_member',
				);
				act(() => {
					fireEvent.click(addAnotherTeamMemberButton);
				});

				const emailInputs = within(inviteModal).getAllByPlaceholderText(
					'email_placeholder',
				);
				expect(emailInputs).toHaveLength(2);

				const nameInputs = within(inviteModal).getAllByPlaceholderText(
					'name_placeholder',
				);
				expect(nameInputs).toHaveLength(2);

				const roleDropdowns = within(inviteModal).getAllByTestId('role-select');
				expect(roleDropdowns).toHaveLength(2);
			});
			it('Should check if the cancel and Invite team members buttons are displayed', () => {
				const cancelButton = within(inviteModal).getByText('cancel');
				expect(cancelButton).toBeInTheDocument();

				const sendButton = within(inviteModal).getByRole('button', {
					name: 'invite_team_members',
				});
				expect(sendButton).toBeInTheDocument();
			});
			it('Should check if clicking on Cancel closes the modal', () => {
				const cancelButton = within(inviteModal).getByText('cancel');
				expect(cancelButton).toBeInTheDocument();

				act(() => {
					fireEvent.click(cancelButton);
				});

				expect(inviteModal).not.toBeInTheDocument();
			});
			it('Should check if clicking on  x icon closes the modal', () => {
				const xButton = within(inviteModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();

				act(() => {
					fireEvent.click(xButton);
				});

				expect(inviteModal).not.toBeInTheDocument();
			});
			it('Should display Invite sent successfully toast is displayed on success of Invite team members button', async () => {
				const emailInput = within(inviteModal).getByPlaceholderText(
					'email_placeholder',
				);
				const nameInput = within(inviteModal).getByPlaceholderText(
					'name_placeholder',
				);

				const sendButton = within(inviteModal).getByTestId(
					'invite-team-members-button',
				);

				act(() => {
					fireEvent.input(emailInput, {
						target: { value: 'john@signoz.io' },
					});
					fireEvent.input(nameInput, {
						target: { value: 'John' },
					});
					fireEvent.click(sendButton);
				});

				await waitFor(() =>
					expect(successNotification).toHaveBeenCalledWith({
						message: 'Invite sent successfully',
					}),
				);
			});
		});

		describe('Should check if the pending invites table is properly displayed:', () => {
			let invitesSection: HTMLElement;
			beforeEach(() => {
				invitesSection = screen.getByTestId('invites-section');
			});
			it('Check if table columns are displayed properly', () => {
				['Name', 'Emails', 'Access Level', 'Invite Link', 'Action'].forEach(
					(column) => {
						expect(within(invitesSection).getByText(column)).toBeInTheDocument();
					},
				);
			});

			it('Should check if the data in the table is properly displayed', () => {
				const keysToIterate = ['name', 'email', 'accessLevel', 'inviteLink'];

				keysToIterate.forEach((key) => {
					expect(
						within(invitesSection).getByText(inviteUser[0]?.[key]),
					).toBeInTheDocument();
				});
			});

			it('Should check if the action data contains Revoke and Copy Invite buttons', () => {
				expect(within(invitesSection).getByText('Revoke')).toBeInTheDocument();

				expect(
					within(invitesSection).getByText('Copy Invite Link'),
				).toBeInTheDocument();
			});
			it('Should check if Copy invite link copies the invite link to the clipboard', async () => {
				const copyInviteLinkButton = within(invitesSection).getByText(
					'Copy Invite Link',
				);
				act(() => {
					copyInviteLinkButton.click();
				});
				await waitFor(() =>
					expect(successNotification).toHaveBeenCalledWith({
						message: 'Success',
					}),
				);
			});
			it('Should check if Clicking on Revoke removes the row and displays success', () => {
				server.use(
					rest.get('http://localhost/api/v1/invite/jane@doe.com', (_, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json({
								data: 'invite revoked successfully',
							}),
						),
					),
				);
				const revokeButton = within(invitesSection).getByText('Revoke');
				act(() => {
					fireEvent.click(revokeButton);
				});
				expect(
					within(invitesSection).queryByText(inviteUser[0]?.email),
				).not.toBeInTheDocument();
				expect(successNotification).toHaveBeenCalledWith({
					message: 'Success',
				});
			});
		});
	});

	describe('Members section', () => {
		let membersSection: HTMLElement;
		beforeEach(() => {
			membersSection = screen.getByTestId('members-section');
		});
		it('Should display the members section title', () => {
			expect(within(membersSection).getByText(/Members/i)).toBeInTheDocument();
		});
		it('Check if table columns are displayed properly (Name, Emails, Access Level, Joined On, Action)', () => {
			['Name', 'Emails', 'Access Level', 'Joined On', 'Action'].forEach(
				(column) => {
					expect(within(membersSection).getByText(column)).toBeInTheDocument();
				},
			);
		});
		it('Should check if the data in the table is properly displayed', () => {
			const keysToIterate = ['name', 'email', 'accessLevel', 'joinedOn'];

			keysToIterate.forEach((key) => {
				let text = memberUser[0]?.[key];
				if (key === 'joinedOn') {
					text = dayjs.unix(Number(text)).format('MMMM DD,YYYY');
				}
				expect(within(membersSection).getByText(text)).toBeInTheDocument();
			});
		});
		it('Should check if the action data contains Edit and Delete buttons', () => {
			expect(within(membersSection).getByText('Edit')).toBeInTheDocument();

			expect(within(membersSection).getByText('Delete')).toBeInTheDocument();
		});
		it('Should check if the edit modal is visible on clicking edit', () => {
			const EditButton = within(membersSection).getByText('Edit');
			act(() => {
				fireEvent.click(EditButton);
			});
			expect(screen.getByTestId('edit-member-modal')).toBeInTheDocument();
		});
		describe('Edit Modal', () => {
			let editModal: HTMLElement;
			beforeEach(() => {
				const editButton = within(membersSection).getByText('Edit');
				act(() => {
					fireEvent.click(editButton);
				});
				editModal = screen.getByTestId('edit-member-modal');
			});

			it('Should check if the title is "Edit member details"', () => {
				expect(
					within(editModal).getByText('Edit member details'),
				).toBeInTheDocument();
			});
			it('Should check if the x icon is present', () => {
				const xButton = within(editModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();
			});
			describe('Should check if the modal body contains ', () => {
				it('email label and input', () => {
					const emailLabel = within(editModal).getByText('Email address');
					expect(emailLabel).toBeInTheDocument();

					const emailInput = within(editModal).getByDisplayValue('jane@doe.com');

					expect(emailInput).toBeInTheDocument();
				});
				it('name label and input', () => {
					const nameLabel = within(editModal).getByText('Name (optional)');
					expect(nameLabel).toBeInTheDocument();

					const nameInput = within(editModal).getByDisplayValue('Jane');

					expect(nameInput).toBeInTheDocument();
				});
				it('role label and dropdown', () => {
					const roleLabel = within(editModal).getByText('Role');
					expect(roleLabel).toBeInTheDocument();

					const roleInput = within(editModal).getByTitle('VIEWER');

					expect(roleInput).toBeInTheDocument();
				});
				it('Generate Reset Password Link button', () => {
					const generatePasswordLinkButton = within(editModal).getByRole('button', {
						name: 'Generate Reset Password link',
					});
					expect(generatePasswordLinkButton).toBeInTheDocument();
				});
				it('submit button', () => {
					const updateButton = within(editModal).getByText('Update Details');
					expect(updateButton).toBeInTheDocument();
				});
			});
			it('Should check if the email address is readonly', () => {
				const emailInput = within(editModal).getByDisplayValue('jane@doe.com');
				expect(emailInput.attributes).toHaveProperty('readonly');
			});
			it('Should check if clicking on "Generate Reset Password Link" button displays the password link input and copy button', async () => {
				const generatePasswordLinkButton = within(editModal).getByRole('button', {
					name: 'Generate Reset Password link',
				});
				act(() => {
					fireEvent.click(generatePasswordLinkButton);
				});

				expect(
					await within(editModal).findByTestId('reset-password-link'),
				).toBeInTheDocument();
				expect(
					await within(editModal).findByTestId('reset-password-link-copy-button'),
				).toBeInTheDocument();
			});
		});
		it('Should check if the delete modal is visible on clicking delete', () => {
			const deleteButton = within(membersSection).getByText('Delete');
			act(() => {
				fireEvent.click(deleteButton);
			});
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByTestId('delete-member-modal')).toBeInTheDocument();
		});
		describe('Delete Modal', () => {
			let deleteModal: HTMLElement;
			beforeEach(() => {
				const deleteButton = within(membersSection).getByText('Delete');
				act(() => {
					fireEvent.click(deleteButton);
				});
				deleteModal = screen.getByTestId('delete-member-modal');
			});

			it('Should check if the title is "Delete member"', () => {
				expect(within(deleteModal).getByText('Delete member')).toBeInTheDocument();
			});
			it('Should check if the x icon is present', () => {
				const xButton = within(deleteModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();
			});
			// it('Should check if the warning icon is displayed', () => {});
			it('Should check if the "Are you sure you want to delete Jane" is displayed', () => {
				expect(
					within(deleteModal).getByText('Are you sure you want to delete Jane'),
				).toBeInTheDocument();
				expect(
					within(deleteModal).getByText(
						'This will remove all access from dashboards and other features in SigNoz',
					),
				).toBeInTheDocument();
			});
			it('Should check if the cancel and ok buttons are displayed', () => {
				expect(within(deleteModal).getByText(/cancel/i)).toBeInTheDocument();
				expect(within(deleteModal).getByText(/ok/i)).toBeInTheDocument();
			});
			it('Should check if the cancel and x buttons are visible', () => {
				const xButton = within(deleteModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();

				const cancelButton = within(deleteModal).getByText(/cancel/i);
				expect(cancelButton).toBeInTheDocument();
			});
			// TODO(shaheer): find the root cause of the cancel and x buttons tests failing
			it('Should check if the x button is closing the modal', async () => {
				const xButton = within(deleteModal).getByRole('button', {
					name: /close/i,
				});

				expect(xButton).toBeInTheDocument();

				act(() => {
					fireEvent.click(xButton);
				});

				expect(
					await screen.findByTestId('delete-member-modal'),
				).not.toBeInTheDocument();
			});
			it('Should check if the cancel button is closing the modal', () => {
				const cancelButton = within(deleteModal).getByText(/cancel/i);
				expect(cancelButton).toBeInTheDocument();

				act(() => {
					fireEvent.click(cancelButton);
				});

				expect(deleteModal).not.toBeInTheDocument();
			});

			// TODO(shaheer): properly mock the data and ensure that this test passes
			it('Should check if the ok button displays "Success" toast', () => {
				server.use(
					rest.delete('http://localhost/api/v1/user/:id', (_, res, ctx) =>
						res(ctx.status(200), ctx.json({ data: 'user deleted successfully' })),
					),
				);
				const revokeButton = within(membersSection).getByText('Delete');
				act(() => {
					fireEvent.click(revokeButton);
				});
				expect(
					within(membersSection).queryByText(memberUser[0]?.email),
				).not.toBeInTheDocument();
				expect(successNotification).toHaveBeenCalledWith({
					message: 'Success',
				});
			});
		});
	});
});
