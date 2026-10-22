import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import APIError from 'types/api/error';

import { ErrorModalProvider, useErrorModal } from './ErrorModalProvider';

// Mock the heavy modal so the test only asserts which error it receives.
jest.mock('components/ErrorModal/ErrorModal', () => ({
	__esModule: true,
	default: ({ error }: { error: APIError }): JSX.Element => (
		<div data-testid="error-message">{error.getErrorMessage()}</div>
	),
}));

function Trigger({ error }: { error: unknown }): null {
	const { showErrorModal } = useErrorModal();
	useEffect(() => {
		showErrorModal(error);
	}, [error, showErrorModal]);
	return null;
}

describe('ErrorModalProvider — showErrorModal', () => {
	it('surfaces the backend error message from a raw AxiosError', () => {
		const axiosError = {
			isAxiosError: true,
			response: {
				status: 400,
				data: {
					error: {
						code: 'tag_invalid_key',
						message: 'tag key contains disallowed characters',
						errors: [],
					},
				},
			},
		};
		render(
			<ErrorModalProvider>
				<Trigger error={axiosError} />
			</ErrorModalProvider>,
		);
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'tag key contains disallowed characters',
		);
	});

	it('passes an already-constructed APIError through unchanged', () => {
		const apiError = new APIError({
			httpStatusCode: 409,
			error: { code: 'conflict', message: 'already exists', url: '', errors: [] },
		});
		render(
			<ErrorModalProvider>
				<Trigger error={apiError} />
			</ErrorModalProvider>,
		);
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'already exists',
		);
	});
});
