import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CreateEdit from '../CreateEdit/CreateEdit';
import {
	mockDomainWithRoleMapping,
	mockGoogleAuthDomain,
	mockGoogleAuthWithWorkspaceGroups,
	mockOidcAuthDomain,
	mockOidcWithClaimMapping,
	mockSamlAuthDomain,
	mockSamlWithAttributeMapping,
} from './mocks';

const mockOnClose = jest.fn();

describe('CreateEdit Modal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Provider Selection (Create Mode)', () => {
		it('renders provider selection when creating new domain', () => {
			render(<CreateEdit isCreate onClose={mockOnClose} />);

			expect(
				screen.getByText(/configure authentication method/i),
			).toBeInTheDocument();
			expect(screen.getByText(/google apps authentication/i)).toBeInTheDocument();
			expect(screen.getByText(/saml authentication/i)).toBeInTheDocument();
			expect(screen.getByText(/oidc authentication/i)).toBeInTheDocument();
		});

		it('returns to provider selection when back button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<CreateEdit isCreate onClose={mockOnClose} />);

			const configureButtons = await screen.findAllByRole('button', {
				name: /configure/i,
			});
			await user.click(configureButtons[0]);

			await waitFor(() => {
				expect(screen.getByText(/edit google authentication/i)).toBeInTheDocument();
			});

			const backButton = screen.getByRole('button', { name: /back/i });
			await user.click(backButton);

			await waitFor(() => {
				expect(
					screen.getByText(/configure authentication method/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('Edit Mode', () => {
		it('shows provider form directly when editing existing domain', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText(/edit google authentication/i)).toBeInTheDocument();
			expect(
				screen.queryByText(/configure authentication method/i),
			).not.toBeInTheDocument();
		});

		it('pre-fills form with existing domain values', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByDisplayValue('signoz.io')).toBeInTheDocument();
			expect(screen.getByDisplayValue('test-client-id')).toBeInTheDocument();
		});

		it('disables domain field when editing', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			const domainInput = screen.getByDisplayValue('signoz.io');
			expect(domainInput).toBeDisabled();
		});

		it('shows cancel button instead of back when editing', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
			expect(
				screen.queryByRole('button', { name: /back/i }),
			).not.toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('shows validation error when submitting without required fields', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<CreateEdit isCreate onClose={mockOnClose} />);

			const configureButtons = await screen.findAllByRole('button', {
				name: /configure/i,
			});
			await user.click(configureButtons[0]);

			const saveButton = await screen.findByRole('button', {
				name: /save changes/i,
			});
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/domain is required/i)).toBeInTheDocument();
			});
		});
	});

	describe('Google Auth Provider', () => {
		it('shows Google Auth form fields', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<CreateEdit isCreate onClose={mockOnClose} />);

			const configureButtons = await screen.findAllByRole('button', {
				name: /configure/i,
			});
			await user.click(configureButtons[0]);

			await waitFor(() => {
				expect(screen.getByText(/edit google authentication/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/domain/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/client id/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/client secret/i)).toBeInTheDocument();
				expect(screen.getByText(/skip email verification/i)).toBeInTheDocument();
			});
		});

		it('shows workspace groups section when expanded', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthWithWorkspaceGroups}
					onClose={mockOnClose}
				/>,
			);

			const workspaceHeader = screen.getByText(/google workspace groups/i);
			await user.click(workspaceHeader);

			await waitFor(() => {
				expect(screen.getByText(/fetch groups/i)).toBeInTheDocument();
				expect(screen.getByText(/service account json/i)).toBeInTheDocument();
			});
		});
	});

	describe('SAML Provider', () => {
		it('shows SAML-specific fields when editing SAML domain', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockSamlAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText(/edit saml authentication/i)).toBeInTheDocument();
			expect(
				screen.getByDisplayValue('https://idp.example.com/sso'),
			).toBeInTheDocument();
			expect(screen.getByDisplayValue('urn:example:idp')).toBeInTheDocument();
		});

		it('shows attribute mapping section for SAML', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockSamlWithAttributeMapping}
					onClose={mockOnClose}
				/>,
			);

			expect(
				screen.getByText(/attribute mapping \(advanced\)/i),
			).toBeInTheDocument();

			const attributeHeader = screen.getByText(/attribute mapping \(advanced\)/i);
			await user.click(attributeHeader);

			await waitFor(() => {
				expect(screen.getByLabelText(/name attribute/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/groups attribute/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/role attribute/i)).toBeInTheDocument();
			});
		});
	});

	describe('OIDC Provider', () => {
		it('shows OIDC-specific fields when editing OIDC domain', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockOidcAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText(/edit oidc authentication/i)).toBeInTheDocument();
			expect(screen.getByDisplayValue('https://oidc.corp.io')).toBeInTheDocument();
			expect(screen.getByDisplayValue('oidc-client-id')).toBeInTheDocument();
		});

		it('shows claim mapping section for OIDC', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockOidcWithClaimMapping}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText(/claim mapping \(advanced\)/i)).toBeInTheDocument();

			const claimHeader = screen.getByText(/claim mapping \(advanced\)/i);
			await user.click(claimHeader);

			await waitFor(() => {
				expect(screen.getByLabelText(/email claim/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/name claim/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/groups claim/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/role claim/i)).toBeInTheDocument();
			});
		});

		it('shows OIDC options checkboxes', () => {
			render(
				<CreateEdit
					isCreate={false}
					record={mockOidcAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			expect(screen.getByText(/skip email verification/i)).toBeInTheDocument();
			expect(screen.getByText(/get user info/i)).toBeInTheDocument();
		});
	});

	describe('Role Mapping', () => {
		it('shows role mapping section in provider forms', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<CreateEdit isCreate onClose={mockOnClose} />);

			const configureButtons = await screen.findAllByRole('button', {
				name: /configure/i,
			});
			await user.click(configureButtons[0]);

			await waitFor(() => {
				expect(screen.getByText(/role mapping \(advanced\)/i)).toBeInTheDocument();
			});
		});

		it('expands role mapping section to show default role selector', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockDomainWithRoleMapping}
					onClose={mockOnClose}
				/>,
			);

			const roleMappingHeader = screen.getByText(/role mapping \(advanced\)/i);
			await user.click(roleMappingHeader);

			await waitFor(() => {
				expect(screen.getByText(/default role/i)).toBeInTheDocument();
				expect(
					screen.getByText(/use role attribute directly/i),
				).toBeInTheDocument();
			});
		});

		it('shows group mappings section when useRoleAttribute is false', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockDomainWithRoleMapping}
					onClose={mockOnClose}
				/>,
			);

			const roleMappingHeader = screen.getByText(/role mapping \(advanced\)/i);
			await user.click(roleMappingHeader);

			await waitFor(() => {
				expect(screen.getByText(/group to role mappings/i)).toBeInTheDocument();
				expect(
					screen.getByRole('button', { name: /add group mapping/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe('Modal Actions', () => {
		it('calls onClose when cancel button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<CreateEdit
					isCreate={false}
					record={mockGoogleAuthDomain}
					onClose={mockOnClose}
				/>,
			);

			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnClose).toHaveBeenCalled();
		});
	});
});
