import type { ComponentProps } from 'react';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, screen } from 'tests/test-utils';

import CustomDomainEditModal from '../CustomDomainEditModal';

const defaultProps: ComponentProps<typeof CustomDomainEditModal> = {
	isOpen: true,
	onClose: jest.fn(),
	customDomainSubdomain: 'my-team',
	dnsSuffix: 'test.cloud',
	isLoading: false,
	updateDomainError: null,
	onClearError: jest.fn(),
	onSubmit: jest.fn(),
};

describe('CustomDomainEditModal status feedback', () => {
	it('shows the valid prefix without an error for the current subdomain', () => {
		render(<CustomDomainEditModal {...defaultProps} />);

		expect(screen.getByTestId('workspace-url-input-prefix')).toBeInTheDocument();
		expect(
			screen.queryByTestId('workspace-url-input-status'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('workspace-url-input-field')).not.toHaveAttribute(
			'aria-invalid',
			'true',
		);
	});

	it('hides the valid prefix when an unchanged value fails validation and restores it after editing', () => {
		render(<CustomDomainEditModal {...defaultProps} />);

		const field = screen.getByTestId('workspace-url-input-field');
		fireEvent.keyDown(field, { key: 'Enter' });

		expect(screen.getByText('Input is unchanged')).toBeInTheDocument();
		expect(screen.getByTestId('workspace-url-input-status')).toBeInTheDocument();
		expect(field).toHaveAttribute('aria-invalid', 'true');
		expect(
			screen.queryByTestId('workspace-url-input-prefix'),
		).not.toBeInTheDocument();
		expect(defaultProps.onSubmit).not.toHaveBeenCalled();

		fireEvent.change(field, { target: { value: 'another-team' } });

		expect(screen.getByTestId('workspace-url-input-prefix')).toBeInTheDocument();
		expect(
			screen.queryByTestId('workspace-url-input-status'),
		).not.toBeInTheDocument();
		expect(field).not.toHaveAttribute('aria-invalid', 'true');
		expect(defaultProps.onClearError).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByTestId('workspace-url-apply'));
		expect(defaultProps.onSubmit).toHaveBeenCalledWith('another-team');
	});

	it('shows only error feedback when the server rejects a valid-length subdomain', () => {
		const updateDomainError = new AxiosError<RenderErrorResponseDTO>(
			'Domain unavailable',
			undefined,
			undefined,
			undefined,
			{
				data: {
					status: 'error',
					error: {
						code: 'domain_unavailable',
						errors: [],
						message: 'Domain unavailable',
						suggestions: [],
						type: 'bad_request',
					},
				},
				status: 500,
				statusText: 'Internal Server Error',
				headers: {},
				config: { headers: new AxiosHeaders() },
			},
		);
		render(
			<CustomDomainEditModal
				{...defaultProps}
				updateDomainError={updateDomainError}
			/>,
		);

		expect(screen.getByText('Domain unavailable')).toBeInTheDocument();
		expect(screen.getByTestId('workspace-url-input-status')).toBeInTheDocument();
		expect(screen.getByTestId('workspace-url-input-field')).toHaveAttribute(
			'aria-invalid',
			'true',
		);
		expect(
			screen.queryByTestId('workspace-url-input-prefix'),
		).not.toBeInTheDocument();
	});

	it('keeps the progress indicator while an update is pending', () => {
		render(<CustomDomainEditModal {...defaultProps} isLoading />);

		expect(
			screen.getByTestId('workspace-url-input-prefix').querySelector('svg'),
		).toHaveClass('animate-spin');
		expect(
			screen.queryByTestId('workspace-url-input-status'),
		).not.toBeInTheDocument();
	});
});
