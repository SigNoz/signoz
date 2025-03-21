import {
	createAPIKeyResponse,
	getAPIKeysResponse,
} from 'mocks-server/__mockdata__/apiKeys';
import { server } from 'mocks-server/server';
import { http, HttpResponse } from 'msw';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';

import APIKeys from './APIKeys';

const apiKeysURL = 'http://localhost/api/v1/pats';
const contentType = 'application/json';

describe('APIKeys component', () => {
	beforeEach(() => {
		server.use(
			http.get(apiKeysURL, () =>
				HttpResponse.json(getAPIKeysResponse, {
					status: 200,
					headers: {
						'Content-Type': contentType,
					},
				}),
			),
		);

		render(<APIKeys />);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders APIKeys component without crashing', () => {
		expect(screen.getByText('API Keys')).toBeInTheDocument();
		expect(
			screen.getByText('Create and manage API keys for the SigNoz API'),
		).toBeInTheDocument();
	});

	it('render list of Access Tokens', async () => {
		server.use(
			http.get(apiKeysURL, () =>
				HttpResponse.json(getAPIKeysResponse, {
					status: 200,
					headers: {
						'Content-Type': `application/json`,
					},
				}),
			),
		);

		await waitFor(() => {
			expect(screen.getByText('No Expiry Key')).toBeInTheDocument();
			expect(screen.getByText('1-5 of 18 keys')).toBeInTheDocument();
		});
	});

	it('opens add new key modal on button click', async () => {
		fireEvent.click(screen.getByText('New Key'));
		await waitFor(() => {
			const createNewKeyBtn = screen.getByRole('button', {
				name: /Create new key/i,
			});

			expect(createNewKeyBtn).toBeInTheDocument();
		});
	});

	it('closes add new key modal on cancel button click', async () => {
		fireEvent.click(screen.getByText('New Key'));

		const createNewKeyBtn = screen.getByRole('button', {
			name: /Create new key/i,
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
		server.use(
			http.post(apiKeysURL, async () =>
				HttpResponse.json(createAPIKeyResponse, {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				}),
			),
		);

		fireEvent.click(screen.getByText('New Key'));

		const createNewKeyBtn = screen.getByRole('button', {
			name: /Create new key/i,
		});

		await waitFor(() => {
			expect(createNewKeyBtn).toBeInTheDocument();
		});

		act(() => {
			const inputElement = screen.getByPlaceholderText('Enter Key Name');
			fireEvent.change(inputElement, { target: { value: 'Top Secret' } });
			fireEvent.click(screen.getByTestId('create-form-admin-role-btn'));
			fireEvent.click(createNewKeyBtn);
		});
	});
});
