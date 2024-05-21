import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

import ResetPassword from './index';

jest.mock('api/user/resetPassword', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.useFakeTimers();

describe('ResetPassword Component', () => {
	beforeEach(() => {
		userEvent.setup();
		jest.clearAllMocks();
	});

	it('renders ResetPassword component correctly', () => {
		render(<ResetPassword version="1.0" />);
		expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
		expect(screen.getByLabelText('Password')).toBeInTheDocument();
		// eslint-disable-next-line sonarjs/no-duplicate-string
		expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
		expect(
			// eslint-disable-next-line sonarjs/no-duplicate-string
			screen.getByRole('button', { name: 'Get Started' }),
		).toBeInTheDocument();
	});

	it('disables the "Get Started" button when password is invalid', async () => {
		render(<ResetPassword version="1.0" />);

		const passwordInput = screen.getByLabelText('Password');
		const confirmPasswordInput = screen.getByLabelText('Confirm Password');
		const submitButton = screen.getByRole('button', { name: 'Get Started' });

		act(() => {
			// Set invalid password
			fireEvent.change(passwordInput, { target: { value: 'password' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'password' } });
		});

		await waitFor(() => {
			// Expect the "Get Started" button to be disabled
			expect(submitButton).toBeDisabled();
		});
	});

	it('enables the "Get Started" button when password is valid', async () => {
		render(<ResetPassword version="1.0" />);

		const passwordInput = screen.getByLabelText('Password');
		const confirmPasswordInput = screen.getByLabelText('Confirm Password');
		const submitButton = screen.getByRole('button', { name: 'Get Started' });

		act(() => {
			fireEvent.change(passwordInput, { target: { value: 'newPassword' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword' } });
		});

		act(() => {
			jest.advanceTimersByTime(500);
		});

		await waitFor(() => {
			// Expect the "Get Started" button to be enabled
			expect(submitButton).toBeEnabled();
		});
	});
});
