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
import { inviteUser, memberUser } from '../__mocks__/OrganizationSettings';

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

jest.mock('hooks/useFeatureFlag/useFeatureFlag', () => ({
	__esModule: true,
	default: (): boolean => true,
}));

jest.mock('hooks/useFeatureFlag/useIsFeatureDisabled', () => ({
	__esModule: true,
	default: (): boolean => false,
}));

const commonOrganizationSettingsTests = ({
	isNonSSoTests = false,
}: {
	isNonSSoTests: boolean;
}): any => {
	describe('Organization Settings Page', () => {
		let displayNameLabel: HTMLElement;
		let displayNameInput: HTMLElement;
		let displayNameSubmitButton: HTMLElement;

		beforeEach(() => {
			server.use(
				rest.get('http://localhost/api/v1/invite', (_, res, ctx) =>
					res(ctx.status(200), ctx.json([inviteUser])),
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

				it('Should check if the data in the table is properly displayed', async () => {
					expect(
						await within(invitesSection).findByText(inviteUser.name),
					).toBeInTheDocument();

					expect(
						await within(invitesSection).findByText(inviteUser.email),
					).toBeInTheDocument();

					expect(
						await within(invitesSection).findByText(inviteUser.role),
					).toBeInTheDocument();

					expect(
						await within(invitesSection).findByText(
							`http://localhost/signup?token=${inviteUser.token}`,
						),
					).toBeInTheDocument();
				});

				it('Should check if the action data contains Revoke and Copy Invite buttons', async () => {
					expect(
						await within(invitesSection).findByText('Revoke'),
					).toBeInTheDocument();

					expect(
						await within(invitesSection).findByText('Copy Invite Link'),
					).toBeInTheDocument();
				});
				it('Should check if Copy invite link copies the invite link to the clipboard', async () => {
					const copyInviteLinkButton = await within(invitesSection).findByText(
						'Copy Invite Link',
					);
					act(() => {
						copyInviteLinkButton.click();
					});
					await waitFor(() =>
						expect(successNotification).toHaveBeenCalledWith({
							message: 'success',
						}),
					);
				});
				it('Should check if Clicking on Revoke removes the row and displays success', async () => {
					const revokeButton = await within(invitesSection).findByText('Revoke');
					act(() => {
						fireEvent.click(revokeButton);
					});

					// eslint-disable-next-line sonarjs/no-identical-functions
					await waitFor(() =>
						expect(successNotification).toHaveBeenCalledWith({
							message: 'success',
						}),
					);
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
			it('Should check if the data in the table is properly displayed', async () => {
				const memberName = await within(membersSection).findAllByText(
					memberUser.name,
				);
				expect(memberName[0]).toBeInTheDocument();

				const memberEmail = await within(membersSection).findAllByText(
					memberUser?.email,
				);
				expect(memberEmail[0]).toBeInTheDocument();

				const memberRole = await within(membersSection).findAllByText(
					memberUser?.role,
				);
				expect(memberRole[0]).toBeInTheDocument();

				const memberJoinDate = await within(membersSection).findAllByText(
					dayjs.unix(Number(memberUser?.createdAt)).format('MMMM DD,YYYY'),
				);
				expect(memberJoinDate[0]).toBeInTheDocument();
			});
			it('Should check if the action data contains Edit and Delete buttons', async () => {
				const editButton = await within(membersSection).findAllByText('Edit');
				expect(editButton[0]).toBeInTheDocument();

				const deleteButton = await within(membersSection).findAllByText('Delete');
				expect(deleteButton[0]).toBeInTheDocument();
			});
			it('Should check if the edit modal is visible on clicking edit', async () => {
				const editButton = await within(membersSection).findAllByText('Edit');
				act(() => {
					fireEvent.click(editButton[0]);
				});
				expect(screen.getByTestId('edit-member-modal')).toBeInTheDocument();
			});
			describe('Edit Modal', () => {
				let editModal: HTMLElement;
				beforeEach(async () => {
					const editButton = await within(membersSection).findAllByText('Edit');
					act(() => {
						fireEvent.click(editButton[0]);
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
					it('email label and input', async () => {
						const emailLabel = await within(editModal).findByText('Email address');
						expect(emailLabel).toBeInTheDocument();

						const emailInput = await within(editModal).findByDisplayValue(
							memberUser.email,
						);

						expect(emailInput).toBeInTheDocument();
					});
					it('name label and input', async () => {
						const nameLabel = within(editModal).getByText('Name (optional)');
						expect(nameLabel).toBeInTheDocument();

						const nameInput = await within(editModal).getByDisplayValue(
							memberUser.name,
						);

						expect(nameInput).toBeInTheDocument();
					});
					it('role label and dropdown', async () => {
						const roleLabel = within(editModal).getByText('Role');
						expect(roleLabel).toBeInTheDocument();

						const roleInput = await within(editModal).findAllByTitle(memberUser.role);

						expect(roleInput[0]).toBeInTheDocument();
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
				it('Should check if the email address is readonly', async () => {
					const emailInput = await within(editModal).findAllByDisplayValue(
						memberUser.email,
					);
					expect(emailInput[0].attributes).toHaveProperty('readonly');
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
			it('Should check if the delete modal is visible on clicking delete', async () => {
				const deleteButton = await within(membersSection).findAllByText('Delete');
				act(() => {
					fireEvent.click(deleteButton[0]);
				});
				// eslint-disable-next-line sonarjs/no-duplicate-string
				expect(screen.getByTestId('delete-member-modal')).toBeInTheDocument();
			});
			describe('Delete Modal', () => {
				let deleteModal: HTMLElement;
				beforeEach(async () => {
					const deleteButton = await within(membersSection).findAllByText('Delete');
					act(() => {
						fireEvent.click(deleteButton[0]);
					});
					deleteModal = await screen.findByTestId('delete-member-modal');
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
				it('Should check if the "Are you sure you want to delete " is displayed', () => {
					expect(
						within(deleteModal).getByText(
							`Are you sure you want to delete ${memberUser.name}`,
						),
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

				it('Should check if the x button is closing the modal', async () => {
					const xButton = within(deleteModal).getByRole('button', {
						name: /close/i,
					});

					expect(xButton).toBeInTheDocument();

					act(() => {
						fireEvent.click(xButton);
					});

					expect(deleteModal.children[0]).toHaveStyle('display: none');
				});
				it('Should check if the cancel button is closing the modal', async () => {
					const cancelButton = await within(deleteModal).findByText(/cancel/i);
					expect(cancelButton).toBeInTheDocument();

					act(() => {
						fireEvent.click(cancelButton);
					});

					expect(deleteModal.children[0]).toHaveStyle('display: none');
				});

				it('Should check if the ok button displays "Success" toast', async () => {
					server.use(
						rest.delete('http://localhost/api/v1/user/:id', (_, res, ctx) =>
							res(ctx.status(200), ctx.json({ data: 'user deleted successfully' })),
						),
					);
					const okButton = await within(deleteModal).findByText(/ok/i);
					act(() => {
						fireEvent.click(okButton);
					});

					// eslint-disable-next-line sonarjs/no-identical-functions
					await waitFor(() =>
						expect(successNotification).toHaveBeenCalledWith({
							message: 'success',
						}),
					);
				});
			});
		});

		if (isNonSSoTests) {
			describe('Authenticated Domains', () => {
				let authenticatedDomainsSection: HTMLElement;
				beforeEach(() => {
					authenticatedDomainsSection = screen.getByTestId(
						'authenticated-domains-section',
					);
				});
				describe('Should display the Authenticated domains section properly:', () => {
					it('Should check if "Authenticated Domains" title is present', () => {
						expect(
							within(authenticatedDomainsSection).getByText('authenticated_domains'),
						).toBeInTheDocument();
					});

					it('Should check if the "Add Domains" button is displayed', () => {
						expect(
							within(authenticatedDomainsSection).getByText('add_domain'),
						).toBeInTheDocument();
					});
				});
				describe('Should check if Add Domains modal is properly displayed:', () => {
					let addDomainsModal: HTMLElement;
					beforeEach(async () => {
						const addDomainsButton = within(authenticatedDomainsSection).getByText(
							'add_domain',
						);
						act(() => {
							fireEvent.click(addDomainsButton);
						});
						addDomainsModal = await screen.findByTestId('add-domain-modal');
					});

					it('Should check if "Add Domains" is displayed in the header', async () => {
						const addDomainsModalTitle = await within(addDomainsModal).findAllByText(
							'Add Domain',
						);
						expect(addDomainsModalTitle[0]).toBeInTheDocument();
					});
					it('Should check if the x icon is displayed', () => {
						const xButton = within(addDomainsModal).getByRole('button', {
							name: /close/i,
						});
						expect(xButton).toBeInTheDocument();
					});
					it('Should check if text box is displayed', () => {
						const domainInput = within(addDomainsModal).getByPlaceholderText(
							'signoz.io',
						);
						expect(domainInput).toBeInTheDocument();
					});
					it('Should check if clicking on Add domains shows "Please enter a valid domain" if text box is empty', async () => {
						const domainInput = within(addDomainsModal).getByPlaceholderText(
							'signoz.io',
						);
						act(() => {
							fireEvent.change(domainInput, {
								target: { value: 'signoz.io' },
							});
							fireEvent.change(domainInput, {
								target: { value: '' },
							});
						});
						expect(
							await within(addDomainsModal).findByText('Please enter a valid domain'),
						).toBeInTheDocument();
					});
					it('Should check if x icon closes the modal', () => {
						const xButton = within(addDomainsModal).getByRole('button', {
							name: /close/i,
						});
						expect(xButton).toBeInTheDocument();
						act(() => {
							fireEvent.click(xButton);
						});
						expect(addDomainsModal).not.toBeInTheDocument();
					});
				});
				it('Should check if the table columns are displayed properly (Domain, Enforce SSO + help icon, Action)', () => {
					['Domain', 'Enforce SSO', 'Action'].forEach((column) => {
						expect(
							within(authenticatedDomainsSection).getByText(column),
						).toBeInTheDocument();
					});
				});
			});
		}
	});
};

export default commonOrganizationSettingsTests;
