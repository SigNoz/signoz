/* eslint-disable sonarjs/no-duplicate-string */

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';

import APIKeys from './APIKeys';

const assertGetByTextWithinTestId = (
	testId: string,
	textList: (string | RegExp)[],
): void => {
	const elementsWithTestId = screen.getAllByTestId(testId);
	const firstElementWithTestId = elementsWithTestId[0];
	textList.forEach((text) =>
		expect(within(firstElementWithTestId).getByText(text)).toBeInTheDocument(),
	);
};

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

describe('APIKeys component', () => {
	beforeEach(() => {
		render(<APIKeys />);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders APIKeys component without crashing', () => {
		expect(screen.getByText('Access Tokens')).toBeInTheDocument();
		expect(
			screen.getByText('Create and manage access tokens for the SigNoz API'),
		).toBeInTheDocument();
	});

	it('render list of Access Tokens', async () => {
		await waitFor(() => {
			expect(screen.getByText('No Expiry Token')).toBeInTheDocument();
			expect(screen.getByText('1-5 of 18 tokens')).toBeInTheDocument();
		});
	});

	it('opens add new key modal on button click', async () => {
		fireEvent.click(screen.getByText('New Token'));
		await waitFor(() => {
			const createNewKeyBtn = screen.getByRole('button', {
				name: /Create new token/i,
			});

			expect(createNewKeyBtn).toBeInTheDocument();
		});
	});

	it('closes add new key modal on cancel button click', async () => {
		fireEvent.click(screen.getByText('New Token'));

		const createNewKeyBtn = screen.getByRole('button', {
			name: /Create new token/i,
		});

		await waitFor(() => {
			expect(createNewKeyBtn).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Cancel'));
		await waitFor(() => {
			expect(createNewKeyBtn).not.toBeInTheDocument();
		});
	});

	it('creates a new key on form submission', async () => {
		fireEvent.click(screen.getByText('New Token'));

		const createNewKeyBtn = screen.getByRole('button', {
			name: /Create new token/i,
		});

		await waitFor(() => {
			expect(createNewKeyBtn).toBeInTheDocument();
		});

		act(() => {
			const inputElement = screen.getByPlaceholderText('Enter Token Name');
			fireEvent.change(inputElement, { target: { value: 'Top Secret' } });
			fireEvent.click(screen.getByTestId('create-form-admin-role-btn'));
			fireEvent.click(createNewKeyBtn);
		});
	});
	it('Should check if "Access Tokens" title is present', () => {
		expect(screen.getByText('Access Tokens')).toBeInTheDocument();
	});

	it('Should check if "Create and manage access tokens for the SigNoz API" sub-title is present', () => {
		expect(
			screen.getByText('Create and manage access tokens for the SigNoz API'),
		).toBeInTheDocument();
	});

	describe('Should check if search bar is properly displayed and works', () => {
		it('Should check if search bar is properly displayed', () => {
			expect(screen.getByTestId('search-icon')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Search for token...'));
		});

		it(`Should check if typing 'something' in the searchbar displays the results`, async () => {
			await waitFor(() => {
				expect(screen.getAllByTestId('token-item-edit-button')).not.toHaveLength(0);

				// type in the searchbar once data is fetched
				const searchInput = screen.getByRole('textbox');

				fireEvent.change(searchInput, {
					target: { value: 'updated by Jane' },
				});

				expect(screen.getAllByTestId('token-item-edit-button')).toHaveLength(1);
			});
		});
	});

	it('Should check if "New Token" Button is visble', () => {
		expect(screen.getByText('New Token')).toBeInTheDocument();
	});

	describe('Should check if Access Token Item is properly displayed', () => {
		it('Should check if the token is collapsed by default', async () => {
			expect(await screen.queryAllByTestId('api-key-body')).toHaveLength(0);
		});
		it('Should check if expanding the token item works properly', async () => {
			await waitFor(() => {
				const expandIcon = document.querySelectorAll('.ant-collapse-header');
				expect(expandIcon.length).toBe(5);
				expect(expandIcon[0].getAttribute('aria-expanded')).toBe('false');
				fireEvent.click(expandIcon[0]);
				expect(expandIcon[0].getAttribute('aria-expanded')).toBe('true');
			});
		});
		it('Should check if the default token item contains (Token Name, Token Value, Role, Expiration, Last used, Edit button, Delete button)', async () => {
			await waitFor(() => {
				const expandIcon = document.querySelectorAll('.ant-collapse-header');
				expect(expandIcon[0].getAttribute('aria-expanded')).toBe('false');

				assertGetByTextWithinTestId('api-key-row', [
					/1 Day Old/,
					/T2/,
					/\*\*\*\*\*\*\*\*/,
					/s=/,
					/Last used/,
					/Never/,
					/Expires in/,
					/1 Days/,
				]);
			});
		});

		it('Should check if the expanded token item contains (Token Name, Token Value, Role, Expiration, Last used, Edit button, Delete button)', async () => {
			await waitFor(() => {
				const expandIcon = document.querySelectorAll('.ant-collapse-header');

				fireEvent.click(expandIcon[0]);

				assertGetByTextWithinTestId('api-key-row', [
					/1 Day Old/,
					/T2/,
					/\*\*\*\*\*\*\*\*/,
					/s=/,
					/Last used/,
					/Never/,
					/Expires in/,
					/1 Days/,
				]);

				assertGetByTextWithinTestId('api-key-body', [
					'Creator',
					'Mando',
					'mando@signoz.io',
					'Created on',
					'Feb 15, 2024 19:45:23',
					'Updated on',
					'Feb 15, 2024 19:56:29',
					'Expires on',
					'Feb 16, 2024 19:44:16',
				]);
			});
		});

		it('Should check if clicking on New token opens modal', async () => {
			act(() => {
				fireEvent.click(screen.getByTestId('api-keys-new-token-button'));
			});

			expect(
				await screen.findByTestId('create-api-key-modal'),
			).toBeInTheDocument();
		});

		it('Should check if clicking on delete token opens the delete token modal', async () => {
			await waitFor(() => {
				const deleteButtons = screen.getAllByTestId('token-item-delete-button');
				act(() => {
					fireEvent.click(deleteButtons[0]);
				});

				expect(screen.getByTestId('delete-api-key-modal')).toBeInTheDocument();
			});
		});

		it('Should check if clicking on edit token opens the edit token modal', async () => {
			await waitFor(() => {
				const editButtons = screen.getAllByTestId('token-item-edit-button');
				act(() => {
					fireEvent.click(editButtons[0]);
				});

				expect(screen.getByTestId('edit-api-key-modal')).toBeInTheDocument();
			});
		});
	});

	describe('Should check if the create token modal is properly displayed', () => {
		let createNewTokenModal: HTMLElement;
		beforeEach(async () => {
			act(() => {
				fireEvent.click(screen.getByTestId('api-keys-new-token-button'));
			});
			createNewTokenModal = await screen.findByTestId('create-api-key-modal');
		});

		it('should display "Create new token" as modal title', async () => {
			const createNewTokenModalTitle = await within(
				createNewTokenModal,
			).findAllByText('Create new token');
			expect(createNewTokenModalTitle[0]).toBeInTheDocument();
		});

		it('Should check if the x icon is displayed', () => {
			const xButton = within(createNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();
		});

		it('Should check if name label and textbox is displayed and name textbox is required', () => {
			expect(within(createNewTokenModal).getByText('Name')).toBeInTheDocument();

			const nameInput = within(createNewTokenModal).getByPlaceholderText(
				'Enter Token Name',
			);

			expect(nameInput).toBeInTheDocument();

			expect(nameInput).toBeRequired();
		});

		it('Should check if role label and options are displayed', () => {
			expect(within(createNewTokenModal).getByText('Role')).toBeInTheDocument();

			const radioButtons = within(createNewTokenModal).getAllByRole('radio');

			expect(radioButtons).toHaveLength(3);

			expect(radioButtons[0].getAttribute('value')).toBe('ADMIN');
			expect(radioButtons[1].getAttribute('value')).toBe('EDITOR');
			expect(radioButtons[2].getAttribute('value')).toBe('VIEWER');
		});

		it('Should check if expiration label and dropdown are displayed', () => {
			expect(
				within(createNewTokenModal).getByText('Expiration'),
			).toBeInTheDocument();

			const expirationDropdown = within(createNewTokenModal).getByTestId(
				'api-key-expiration-dropdown',
			);

			expect(expirationDropdown).toBeInTheDocument();
		});

		it('Should check if clicking on Cancel closes the modal', () => {
			const cancelButton = within(createNewTokenModal).getByText('Cancel');
			expect(cancelButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(cancelButton);
			});

			expect(createNewTokenModal).not.toBeInTheDocument();
		});

		it('Should check if clicking on  x icon closes the modal', () => {
			const xButton = within(createNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(xButton);
			});

			expect(createNewTokenModal).not.toBeInTheDocument();
		});

		it('hould check if submitting empty form displays validation message with name "Please enter Name"', async () => {
			const createButton = within(createNewTokenModal).getByRole('button', {
				name: /create new token/i,
			});

			act(() => {
				fireEvent.click(createButton);
			});

			expect(
				await within(createNewTokenModal).findByText(`'name' is required`),
			).toBeInTheDocument();
		});

		it('Should check if the name textbox rejects names with less than 6 characters and displays "Name must be at least 6 characters"', async () => {
			const nameInput = within(createNewTokenModal).getByPlaceholderText(
				'Enter Token Name',
			);
			const createButton = within(createNewTokenModal).getByRole('button', {
				name: /create new token/i,
			});

			act(() => {
				fireEvent.change(nameInput, { target: { value: '12345' } });
				fireEvent.click(createButton);
			});

			expect(
				await within(createNewTokenModal).findByText(
					`'name' must be at least 6 characters`,
				),
			).toBeInTheDocument();
		});

		describe('Valid Token Submit Success Modal', () => {
			let newTokenSuccessModal: HTMLElement;
			beforeEach(async () => {
				const nameInput = within(createNewTokenModal).getByPlaceholderText(
					'Enter Token Name',
				);
				const createButton = within(createNewTokenModal).getByRole('button', {
					name: /create new token/i,
				});

				act(() => {
					fireEvent.change(nameInput, { target: { value: 'Test Token' } });
					fireEvent.click(createButton);
				});

				await waitFor(() => {
					// new-token-success-modal
					newTokenSuccessModal = screen.getByTestId('new-token-success-modal');

					expect(newTokenSuccessModal).toBeInTheDocument();
				});
			});

			it('Should check if the token details are properly displayed in the modal', async () => {
				assertGetByTextWithinTestId('new-token-success-modal', [
					/1 Day Old/,
					/T2/,
					/\*\*\*\*\*\*\*\*\*\*\*\*\*\*\**/,
					/s=/,
					/Name/,
					/1 Day Old/,
					/Role/,
					/Admin/,
					/Creator/,
					/Mando/,
					/Created on/,
					/Feb 15, 2024 19:45:23/,
					/Expires on/,
					/Feb 16, 2024 19:44:16/,
				]);

				expect(
					within(createNewTokenModal).getByTestId('copy-key-close-btn'),
				).toBeInTheDocument();
			});

			it('Should display success toast containing "Copied to clipboard", and close the modal', async () => {
				const copyButton = within(createNewTokenModal).getByTestId(
					'copy-key-close-btn',
				);

				act(() => {
					fireEvent.click(copyButton);
				});

				await waitFor(() => {
					expect(successNotification).toHaveBeenCalledWith({
						message: 'Copied to clipboard',
					});
					expect(createNewTokenModal).not.toBeInTheDocument();
				});
			});
		});
	});
	describe('Should check if delete token modal is properly displayed', () => {
		let deleteNewTokenModal: HTMLElement;
		beforeEach(async () => {
			await waitFor(() => {
				const deleteButtons = screen.getAllByTestId('token-item-delete-button');
				act(() => {
					fireEvent.click(deleteButtons[0]);
				});
				deleteNewTokenModal = screen.getByTestId('delete-api-key-modal');
				expect(deleteNewTokenModal).toBeInTheDocument();
			});
		});

		it('should display "Delete Token" as modal title', async () => {
			const deleteNewTokenModalTitle = await within(
				deleteNewTokenModal,
			).findAllByText('Delete Token');
			expect(deleteNewTokenModalTitle[0]).toBeInTheDocument();
		});

		it('Should check if the x icon is displayed', () => {
			const xButton = within(deleteNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();
		});

		it(`Should check if the modal body displays message "Are you sure you want to delete 'testingabc' token? Deleting a token is irreversible and cannot be undone."`, () => {
			within(deleteNewTokenModal).getByText('delete_confirm_message');
		});

		it('Should check if clicking on Cancel closes the modal', () => {
			const cancelButton = within(deleteNewTokenModal).getByText('Cancel');
			expect(cancelButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(cancelButton);
			});

			expect(deleteNewTokenModal).not.toBeInTheDocument();
		});

		it('Should check if clicking on  x icon closes the modal', () => {
			const xButton = within(deleteNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(xButton);
			});

			expect(deleteNewTokenModal).not.toBeInTheDocument();
		});

		it('Should check if clicking the delete button closes the modal', async () => {
			const deleteButton = within(deleteNewTokenModal).getByTestId(
				'delete-modal-delete-button',
			);
			act(() => {
				fireEvent.click(deleteButton);
			});
			await waitFor(() => {
				expect(deleteNewTokenModal).not.toBeVisible();
			});
		});
	});

	describe('Should check if the Edit token modal is displayed properly', () => {
		let editNewTokenModal: HTMLElement;
		beforeEach(async () => {
			await waitFor(() => {
				const editButtons = screen.getAllByTestId('token-item-edit-button');
				act(() => {
					fireEvent.click(editButtons[0]);
				});
				editNewTokenModal = screen.getByTestId('edit-api-key-modal');
				expect(editNewTokenModal).toBeInTheDocument();
			});
		});

		it('Should check that the title is "Edit token"', async () => {
			const editNewTokenModalTitle = await within(editNewTokenModal).findAllByText(
				'Edit token',
			);
			expect(editNewTokenModalTitle[0]).toBeInTheDocument();
		});

		it('Should check if the x icon is displayed', () => {
			const xButton = within(editNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();
		});

		it('Should check if name label and textbox is displayed and name textbox is required', () => {
			expect(within(editNewTokenModal).getByText('Name')).toBeInTheDocument();

			const nameInput = within(editNewTokenModal).getByPlaceholderText(
				'Enter Token Name',
			);

			expect(nameInput).toBeInTheDocument();

			expect(nameInput).toBeRequired();
		});

		it('Should check if role label and options are displayed', () => {
			expect(within(editNewTokenModal).getByText('Role')).toBeInTheDocument();

			const radioButtons = within(editNewTokenModal).getAllByRole('radio');

			expect(radioButtons).toHaveLength(3);

			expect(radioButtons[0].getAttribute('value')).toBe('ADMIN');
			expect(radioButtons[1].getAttribute('value')).toBe('EDITOR');
			expect(radioButtons[2].getAttribute('value')).toBe('VIEWER');
		});

		it('Should check if clicking on  x icon closes the modal', () => {
			const xButton = within(editNewTokenModal).getByRole('button', {
				name: /close/i,
			});
			expect(xButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(xButton);
			});

			expect(editNewTokenModal).not.toBeInTheDocument();
		});

		it('Should check if clicking on Cancel closes the modal', () => {
			const cancelButton = within(editNewTokenModal).getByText('Cancel');
			expect(cancelButton).toBeInTheDocument();

			act(() => {
				fireEvent.click(cancelButton);
			});

			expect(editNewTokenModal).not.toBeInTheDocument();
		});

		it('Should close modal on clicking the update button', async () => {
			const updateButton = within(editNewTokenModal).getByTestId(
				'edit-modal-update-button',
			);

			act(() => {
				fireEvent.click(updateButton);
			});

			await waitFor(() => {
				expect(editNewTokenModal).not.toBeVisible();
			});
		});
	});
});
